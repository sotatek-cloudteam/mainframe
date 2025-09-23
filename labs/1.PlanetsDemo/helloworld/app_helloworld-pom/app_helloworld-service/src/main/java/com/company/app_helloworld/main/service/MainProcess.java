package com.company.app_helloworld.main.service;

import com.company.app_helloworld.main.business.context.MainContext;
import com.netfective.bluage.gapwalk.rt.call.ExecutionController;

/**
 * Interface MainProcess.
 * 
 * Defines application services for MainProcess
 */
public interface MainProcess {

	/**
	 * Process operation procedureDivision.
	 * 
	 * PROGRAM-ID.HELLO.
	 * *
	 * *
	 * 
	 * @param ctx 
	 * @param ctrl 
	 */
	void procedureDivision(final MainContext ctx, final ExecutionController ctrl);

}
