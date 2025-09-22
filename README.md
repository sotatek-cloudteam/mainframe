# What is AWS Mainframe Modernization

This is an integrated solution designed to help organizations migrate and modernize their mainframe applications in the cloud.
IT includes tools and services to assess, replatform, and refactor mainframe applications, along with a managed runtime environment and developer tooling.

Key components and capabilities of the solution include:
1. Migration and Modernization Tools: The service provides tools and services necessary to assess, replatform, and refactor mainframe applications. It supports all phases of the modernization journey, from initial planning to post-migration cloud operations.
2. Managed Runtime Environment: It offers a managed runtime environment on AWS that efficiently creates, manages, and monitors modernized applications. This environment is self-healing, auto-scaling, and continuously monitors workloads for reliability and performance.
3. Modernization Patterns: Users can choose between two main automated patterns:
    ◦ Automated Refactoring (powered by AWS Blu Age): This process accelerates modernization by converting the complete legacy application stack (including application code and data layer) into a modern, multi-tier Java-based application. This generates API-enabled backends and web-based frontends while preserving functional behavior.
    ◦ Replatforming (powered by Rocket Software Enterprise Suite): This pattern allows organizations to port applications with minimal code changes. It preserves existing programming languages (like COBOL or PL/I) and structures, while moving the system to cloud-managed services and adopting modern DevOps practices.
4. Developer Tooling: The service includes an on-demand, web-based Integrated Development Environment (IDE), such as the Rocket Developer IDE, which supports smart editing, debugging, and instant compilation. Tools like AWS Blu Insights are also available for codebase analysis and transformation.

Mind map:
![mindmap](./images/NotebookLM%20Mind%20Map.png)

# Why We Need This Service and What Problems It Solves

AWS Mainframe Modernization is needed because it addresses the complexity, cost, and agility challenges associated with traditional mainframes by facilitating a planned transition to modern cloud environments

The problems and challenges solved by the service include:
1. Overcoming Legacy Technology and Code
*  The Problem: Mainframe applications often rely on legacy programming languages (like COBOL and Assembler), older transaction processing systems (like CICS), and specific data storage mechanisms (like VSAM, IMS DB, or Db2). Modernizing these components is complex.
* The Solution: AWS Mainframe Modernization offers automated tools to handle this transition.
    * Automated Refactoring converts legacy codebases into modern Java, solving the problem of aging languages and staff turnover (such as the COBOL knowledge gap).
    * Replatforming allows applications written in languages like COBOL or PL/I to run on cloud infrastructure while preserving the application logic, minimizing the disruption to application knowledge and skills.
2. Improving Operational Agility and IT Processes
* The Problem: Traditional mainframe processes can be slow, rigid, and lack the quick feedback loops of modern development.
* The Solution: The service supports an evolutionary modernization approach designed to achieve short-term wins by improving agility.
    * It helps application development teams implement an automated CI/CD pipeline. This enables more frequent and reliable code changes, accelerating migration speed and reducing the time-to-market for releasing new business functions.
    * It helps organizations adopt modern development best practices, even in the replatforming pattern, by moving IT operations processes to cloud-based managed services.
3. Enhancing Scalability, Reliability, and Management
* The Problem: Managing and monitoring enterprise workloads on legacy infrastructure can be resource-intensive and prone to failure.
* The Solution: The managed runtime environment addresses operational reliability and scalability issues.
    * It continuously monitors clusters to keep workloads running.
    * It provides self-healing compute and automated scaling, ensuring performance and reliability.
4. Project Planning and Risk Mitigation
* The Problem: Mainframe migration projects are often complex, making it difficult to accurately scope, budget, and plan.
* The Solution: Assessment tools are provided to help organizations assess, scope, and plan their migration and modernization projects, determining feasibility and strategy. The sample application, CardDemo, is designed specifically to provide a realistic environment for testing various modernization approaches, including discovery, migration assessment, and performance testing.
5. Integration and Security
* The Problem: Integrating mainframe systems into the broader IT ecosystem or ensuring consistent security and compliance is challenging.
* The Solution: AWS Mainframe Modernization supports integrations with other essential AWS services, such as AWS CloudFormation (for repeatable deployment and DevOps), AWS Key Management Service (for security and compliance), Amazon RDS, Amazon S3, and AWS Migration Hub.

# Overview Flow of AWS Mainframe Modernization

## Step 1: Input and Assessment

| Component                  | Description                                                                                                                                                                                                                                          | Service Responsible                                  |
|----------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------|
| Input (Legacy source code) | The core input consists of the existing mainframe application assets, which may include source code written in COBOL or PL/I. Legacy components often include CICS (transaction processing), JCL (batch processing), and VSAM/IMS DB (data storage). | N/A (Source Asset)                                   |
| Assessment                 | The legacy environment is assessed to plan the modernization project, determining its scope, feasibility, and strategy.                                                                                                                              | Assessment tools within AWS Mainframe Modernization. |

## Step 2: Processing and Transformation (Mainframe has two patterns)

AWS Mainframe Modernization offers two primary patterns for processing the input source code:

1. Path A: Automated Refactoring (Powered by AWS Blu Age)

    This path converts the entire application stack into modern Java code.

| Component                | Description                                                                                                                                                                                          | Service Responsible           |
|--------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------|
| Code Analysis            | The legacy codebase undergoes analysis, providing insight into the structure and complexity of the application.                                                                                      | AWS Blu Insights              |
| Automated Transformation | The complete legacy application stack, including the application code and data layer, is automatically converted.                                                                                    | Blu Age Transformation Center |
| Output (Transformed Code | The legacy code is converted into a modern, multi-tier Java-based application. This process generates API-enabled backends and web-based frontends while preserving the original functional behavior | Blu Age Transformation Center |
| Development/ Testing     | Developers can refine and test the newly generated Java code                                                                                                                                         | Blu Age Developer IDE         |

2. Path B: Replatforming (Powered by Rocket Software/Micro Focus)

    This path preserves the original programming language and structure while moving the execution environment to the cloud

| Component                | Description                                                                                                                                                          | Service Responsible                     |
|--------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------|
| Application Development  | Developers port the application with minimal code changes. Development tasks like smart editing, debugging, instant code compilation, and unit testing are performed | Rocket Developer IDE, Vs Code, vim, ... |
| Output (Modified Code)   | The application source code (still in its original language, like COBOL or PL/I) is recompiled                                                                       | Rocket Developer IDE / Rocket runtime   |

## Step 3: Deployment and Operation

Once the code is transformed (Refactoring) or recompiled (Replatforming), it is prepared for deployment to the AWS managed runtime environment.

| Component                    | Description                                                                                                                                                                                                                           | Service Responsible                                                                           |
|------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|
| Artifacts storage            | The application source code and definition files (such as the JSON configuration used to define the source location and runtime settings) are uploaded for deployment                                                                 | AWS S3                                                                                        |
| Environment Creation         | A managed runtime environment is created on AWS, specifying the required engine (AWS Blu Age or Rocket Software)                                                                                                                      | AWS Mainframe Modernization console / Managed Runtime Environment                             |
| Deployment                   | AWS Mainframe Modernization console and AWS CloudFormation (for CI/CD pipelines)                                                                                                                                                      | AWS Mainframe Modernization console and AWS Code Pipeline, Code Build (for CI/CD pipelines)   |
| Output (Running Application) | The application is started. It is then accessible via a DNS hostname over an exposed port (e.g., HTTP on port 8196). The modernized application is monitored continuously, benefiting from self-healing compute and automated scaling | AWS Mainframe Modernization Managed Runtime Environment                                       |
| Data Storage                 | Modernized databases supporting the application are hosted                                                                                                                                                                            | Amazon RDS, Amazon FSx, or Amazon EFS                                                         |
