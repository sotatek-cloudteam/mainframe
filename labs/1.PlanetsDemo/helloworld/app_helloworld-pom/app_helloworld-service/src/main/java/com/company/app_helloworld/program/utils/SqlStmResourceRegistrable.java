package com.company.app_helloworld.program.utils;

import com.netfective.bluage.gapwalk.rt.provider.SqlStmRegistry;
import java.io.File;
import org.springframework.stereotype.Component;

/**
 * SqlStm resource registrable.
 */
@Component
public class SqlStmResourceRegistrable extends ResourceRegistrable {
	
	/**
	 * Instantiates a new sql-statements resource registrable.
	 */
	public SqlStmResourceRegistrable() {
		super("sql", "SQL Statements files", "/sqlstm/**/*.sql");
	}
	
	/**
	 * Unregister resource.
	 * @param identifier the identifier
	 * @param file the file
	 */
	@Override
	public void unregisterResource(String identifier, File file) {
		SqlStmRegistry.unregisterSQLStmFile(identifier, file);
	}
	
	/**
	 * Register resource. The source folder(s) of the file is added to the identifier.
	 * @param identifier the identifier
	 * @param file the file
	 */
	@Override
	public void registerResource(String identifier, File file) {
		String path = file.getPath().replace('\\', '/');
		identifier = path.substring(path.indexOf("/sqlstm/") + 8, path.lastIndexOf("/") + 1).toUpperCase() + identifier;
		SqlStmRegistry.registerSQLStmFile(identifier, file);
	}
}
