package com.company.app_helloworld.program.utils;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Load resources into the container resource registry.
 */
@Component
public class ResourcesLoader {

	@Autowired	
	GroovyScriptRegistrable scriptsGroovyResourceRegistrable;
	
	@Autowired
	SqlResourceRegistrable sqlResourceRegistrable;
	
	@Autowired
	SqlStmResourceRegistrable sqlStmResourceRegistrable;
	
	@Autowired
	ScriptDaemonRegistrable scriptsDaemonsResourceRegistrable;
	
	@Autowired
	QueriesDatabaseMappingRegistrable queriesDatabaseMappingResourceRegistrable;
	
	@Autowired
	JasperResourceRegistrable jasperResourceRegistrable;
	
	@Autowired
	DatasetCatalogRegistrable datasetCatalog;
	
	@Autowired
	LnkJsonResourceRegistrable lnkResourceRegistrable;
		
	@Autowired
	MessageLoader messageLoader;
	
	@Autowired
	BindingRegistrable bindingRegistrable;
	
		
	@PostConstruct
	public void registerResources() {		
		scriptsGroovyResourceRegistrable.register();
		sqlResourceRegistrable.register();
		sqlStmResourceRegistrable.register();
		scriptsDaemonsResourceRegistrable.register();
		queriesDatabaseMappingResourceRegistrable.register();
		jasperResourceRegistrable.register();
		datasetCatalog.register();
		lnkResourceRegistrable.register();
		messageLoader.register();
		bindingRegistrable.register();
	}
	
	/**
	 * Unregister all resources previously added.
	 */	 
	@PreDestroy
	public void unregisterResources() {
		scriptsGroovyResourceRegistrable.unregister();
		sqlResourceRegistrable.unregister();
		sqlStmResourceRegistrable.unregister();
		scriptsDaemonsResourceRegistrable.unregister();
		queriesDatabaseMappingResourceRegistrable.unregister();
		jasperResourceRegistrable.unregister();
		datasetCatalog.unregister();
		lnkResourceRegistrable.unregister();
		messageLoader.unregister();
		bindingRegistrable.unregister();
	}
}


