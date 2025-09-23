package com.company.app_helloworld;

import com.company.app_helloworld.core.helper.ConfigurationHelper;
import com.company.app_helloworld.program.utils.SpringBootApplicationBanner;
import com.netfective.bluage.gapwalk.io.support.FileConfigurationUtils;
import com.netfective.bluage.gapwalk.rt.call.internal.UserDefinedParameters;
import com.netfective.bluage.gapwalk.rt.context.ApplicationContextRegistry;
import com.netfective.bluage.gapwalk.rt.context.ProgramContextStore;
import com.netfective.bluage.gapwalk.rt.io.support.FileConfiguration;
import com.netfective.bluage.gapwalk.rt.jics.JicsParameters;
import com.netfective.bluage.gapwalk.rt.provider.CustomComponentsURLRegistry;
import com.netfective.bluage.gapwalk.rt.provider.LogicalProgramRegistry;
import com.netfective.bluage.gapwalk.rt.provider.ProgramContainer;
import com.netfective.bluage.gapwalk.rt.provider.ProgramRegistry;
import com.netfective.bluage.gapwalk.rt.provider.ServiceContainer;
import com.netfective.bluage.gapwalk.rt.provider.ServiceRegistry;
import java.io.File;
import java.io.IOException;
import java.nio.charset.Charset;
import java.util.Map;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.BeanFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnJndi;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.DependsOn;
import org.springframework.context.annotation.Primary;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.lookup.JndiDataSourceLookup;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.web.WebApplicationInitializer;
import org.springframework.web.context.WebApplicationContext;
/**
 * SpringBoot web application launcher.
 * Entry point for Tomcat deployment and programs/services/scripts registration.
 */
@SpringBootConfiguration
@ComponentScan(basePackages = {"com.company.app_helloworld.program", "com.company.app_helloworld.core","com.netfective.bluage.gapwalk.io.support"
})
@EnableConfigurationProperties
public class SpringBootLauncher extends SpringBootServletInitializer implements WebApplicationInitializer {
	// Logger declaration.
	private static final Logger LOGGER = LoggerFactory.getLogger(SpringBootLauncher.class );

	/**
	 * The spring web application context. The parent context of all sub programs.
	 */
	private static ConfigurableApplicationContext applicationContext;

	@Autowired
	BeanFactory beanFactory;
	
	/**
	 * Flag to enable warmup of the pre construct of contexts.
	 */
	@Value("${context.warmup.enabled:false}")
	private boolean contextWarmupEnabled;


	@Override
	protected SpringApplicationBuilder configure(SpringApplicationBuilder application) {
		Charset charset = Charset.forName("CP1047");
		JicsParameters.setGlobalCharset(charset);
		return application.banner(new SpringBootApplicationBanner("app_helloworld")).profiles("app_helloworld").sources(SpringBootLauncher.class);
	}

	@Override
	protected WebApplicationContext run(SpringApplication application) {
		applicationContext = application.run();
		return (WebApplicationContext) applicationContext;
	}
	
	/**
	 * Get spring web application context.
	 * @return the spring web application context
	 */
	public static ConfigurableApplicationContext getCac() {
		return applicationContext;
	}
	
	/**
	 * Setup default file configurations.
	 * @param configurationHelper the configuration helper
	 * @return file configurations
	 */
	@Bean
	public Map<String, FileConfiguration> fileConfigurations(ConfigurationHelper configurationHelper) {
		return new FileConfigurationUtils().createFileConfigurationFromMap(configurationHelper.getFilesConfiguration()).getFileConfigurations();
	}	
	
	/**
	 * Setup a JNDI datasource.
	 * Will be shared with sub programs and used by modernized ExecSQL statements.
	 * @return a datasource
	 */
	@ConditionalOnJndi(value = "java:comp/env/jdbc/primary")
	@Bean(name = "primaryDataSource")
	@Primary
	public DataSource primaryJndiDataSource() {
		return (new JndiDataSourceLookup()).getDataSource("java:comp/env/jdbc/primary");
	}
	
	/**
	 * Build a data source properties.
	 * @return a DataSourceProperties
	 */
	@ConditionalOnMissingBean(name = "primaryDataSource")
	@Bean(destroyMethod = "")
	@Primary
	@ConfigurationProperties(prefix = "spring.datasource.primary")
	public DataSourceProperties primaryDataSourceProperties() {
		return new DataSourceProperties();
	}
	
	/**
	 * Setup a datasource.
	 * Will be shared with sub programs and used by modernized ExecSQL statements.
	 * @return a datasource
	 */
	@DependsOn("primaryDataSourceProperties")
	@ConditionalOnMissingBean(name = "primaryDataSource")
	@Bean(name = "primaryDataSource")
	@Primary
	@ConfigurationProperties(prefix = "spring.datasource.primary")
	public DataSource primaryDataSource() {
		return primaryDataSourceProperties().initializeDataSourceBuilder().build();
	}
	
		
	/**
	 * The transaction manager setup to handle ExecSQL statements.
	 * @return the platform transaction manager
	 */
	@Bean
	public PlatformTransactionManager platformTransactionManager(DataSource primaryDataSource) {
		return new DataSourceTransactionManager(primaryDataSource);
	}
	

	/**
	 * Initialization method called when the spring application is ready.
	 * Register all programs and services to the gapwalk shared context.
	 * @param event the application ready event
	 */
	@EventListener
	public void initialize(ApplicationReadyEvent event) {
	    UserDefinedParameters.setAddressingMode(31);
		Map<String, ProgramContainer> programContainers = event.getApplicationContext().getBeansOfType(ProgramContainer.class);
		programContainers.values().forEach(ProgramRegistry::registerProgram);
		LogicalProgramRegistry.setAppContext(event.getApplicationContext());
		LogicalProgramRegistry.getLogicalPrograms().forEach(ProgramRegistry::registerLogicalProgram);
		Map<String, ServiceContainer> serviceContainers = event.getApplicationContext().getBeansOfType(ServiceContainer.class);
		serviceContainers.values().forEach(ServiceRegistry::registerService);
		
		if (contextWarmupEnabled) {
			ProgramContextStore.preloadAllContexts(event.getApplicationContext(), beanFactory);
		}
		
		enlistCustomJars(event);
		
		// register the current context
		ApplicationContext context = event.getApplicationContext();
		ApplicationContextRegistry.registerContext(ApplicationContextRegistry.SERVICE, context);
		
		
	}
	
	
	private void enlistCustomJars(ApplicationReadyEvent event) {
		try {
			File folder = event.getApplicationContext().getResource("/WEB-INF/lib").getFile();
			File[] customJars = folder.listFiles(j -> j.getName().endsWith(".jar"));
			if(customJars != null && customJars.length > 0) {
				for (File customJar : customJars) {
					LOGGER.info("Adding {} to groovy classpath", customJar.toURI().toURL());
					CustomComponentsURLRegistry.addURL(customJar.toURI().toURL());
				}
			}
		} catch (IOException ioe) {
			LOGGER.error("Unable to enlist custom jars", ioe);
		}
	}
}
