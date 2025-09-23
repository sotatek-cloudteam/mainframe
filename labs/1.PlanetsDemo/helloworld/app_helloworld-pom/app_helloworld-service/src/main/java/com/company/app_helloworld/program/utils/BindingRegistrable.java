package com.company.app_helloworld.program.utils;

import com.netfective.bluage.gapwalk.rt.provider.LogicalProgramRegistry;
import java.io.File;
import org.springframework.stereotype.Component;

/**
 * Binding json resource registrable.
 */
@Component
public class BindingRegistrable extends ResourceRegistrable {
	
	/**
	 * Instantiates a new binding resource registrable.
	 */
	public BindingRegistrable() {
		super("bindings", "program bindings files", "/bindings/*.json");
	}
	
	/**
	 * Unregister resource.
	 * @param identifier the identifier
	 * @param file the file
	 */
	@Override
	public void unregisterResource(String identifier, File file) {
		if (!LogicalProgramRegistry.isEmpty()) {
			LogicalProgramRegistry.clearAllBindings();
		}
	}
	
	/**
	 * Register resource.
	 * @param identifier the identifier
	 * @param file the file
	 */
	@Override
	public void registerResource(String identifier, File file) {
		LogicalProgramRegistry.registerBinding(file);
	}
}
