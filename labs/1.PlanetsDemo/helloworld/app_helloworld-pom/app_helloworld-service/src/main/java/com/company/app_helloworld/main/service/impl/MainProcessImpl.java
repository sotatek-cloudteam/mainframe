
package com.company.app_helloworld.main.service.impl;

import com.company.app_helloworld.main.business.context.MainContext;
import com.company.app_helloworld.main.service.MainProcess;
import com.netfective.bluage.gapwalk.rt.call.ExecutionController;
import com.netfective.bluage.gapwalk.runtime.tool.DisplayUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

/**
 * Class MainProcessImpl
 * 
 * Defines application services for MainProcess
 * @see MainProcess
 */
@Service("com.company.app_helloworld.main.service.MainProcess")
@Lazy

public class MainProcessImpl implements MainProcess {

	/**
	 * The logger.
	 */
	private static final Logger LOGGER = LoggerFactory.getLogger(MainProcessImpl.class);


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
	@Override
	public void procedureDivision(final MainContext ctx, final ExecutionController ctrl) {
		/* 
		* */
		DisplayUtils.display(ctx, ctrl, LOGGER, "HELLO WORLD");
		ctrl.stopRunUnit();
	}

}
