// Import
import com.netfective.bluage.gapwalk.rt.provider.ScriptRegistry
import com.netfective.bluage.gapwalk.rt.call.MainProgramRunner
import com.netfective.bluage.gapwalk.io.support.FileConfigurationUtils
import com.netfective.bluage.gapwalk.rt.job.support.DefaultJobContext
import com.netfective.bluage.gapwalk.rt.utils.GroovyUtils
import com.netfective.bluage.gapwalk.rt.io.support.FileConfiguration
import com.netfective.bluage.gapwalk.rt.shared.AbendException
import com.netfective.bluage.gapwalk.rt.call.exception.GroovyExecutionException
// Variables
mpr = applicationContext.getBean("com.netfective.bluage.gapwalk.rt.call.ExecutionController", MainProgramRunner.class)
TreeMap mapTransfo = [:]
Map params = ["MapTransfo":mapTransfo]
// Execute job with utility functions
Binding binding = new Binding()
binding.setVariable("jobContext", jobContext)
def shell = new GroovyShell(binding).parse(ScriptRegistry.getScript("functions"))
//*********************************************************************
//*                             JOB                                   *
//*********************************************************************
shell.with {
	def jobName = "VSCODE"
	mpr.setJobContext(jobContext)
	displayStartJob(jobName)
	Map programResults = jobContext.getProgramResults().clone()
	def lastProgramResult
	stepVSCOMP(shell, jobName, params, programResults)
	displayEndJob(jobName)
	return programResults.get("GroovyExecutionResult")
}
//*********************************************************************
//*                            STEPS                                  *
//*********************************************************************
// STEP VSCOMP - PROC - COBUCG****************************************************
def stepVSCOMP(Object shell, String jobName, Map params, Map programResults) {
	shell.with{
		if (checkValidProgramResults(programResults)) {
			def stepName = 'VSCOMP'
			execStepSimple(stepName, programResults, {
				def procName = 'COBUCG'
				TreeMap mapTransfo = new TreeMap(params["MapTransfo"])
				mapTransfo['PARM.COB'] = 'FLAGW,LOAD,SIZE=2048K,BUF=1024K'
				Map<String,FileConfiguration> fcmap = new FileConfigurationUtils()
				.withJobContext(jobContext)
				.dummy("COB.SYSPUNCH")
				.build()
				.bluesam("COB.SYSIN")
				.dataset("HERC02.VSCODE.C01HELLO.WORLD")
				.disposition("SHR")
				.build()
				.bluesam("COB.SYSLIB")
				.dataset("SYS1.COBLIB")
				.disposition("SHR")
				.build()
				.systemOut("GO.SYSOUT")
				.output("*")
				.build()
				.getFileConfigurations();
				File procFile = ScriptRegistry.getScript(procName);
				File resolvedProcFile = buildResolvedFile(jobName,stepName,procName)
				GroovyUtils.processGroovyParams(procFile, resolvedProcFile, mapTransfo, programResults)
				return execGroovy(applicationContext, mapTransfo, resolvedProcFile, jobContext, fcmap)
			})
		}
	}
}
