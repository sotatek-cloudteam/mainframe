# What is AWS Mainframe Modernization

This is an integrated solution designed to help organizations migrate and modernize their mainframe applications in the cloud.
It includes tools and services to assess, replatform, and refactor mainframe applications, along with a managed runtime environment and developer tooling.

## Table of Contents
- [What is AWS Mainframe Modernization](#what-is-aws-mainframe-modernization)
- [Why We Need This Service and What Problems It Solves](#why-we-need-this-service-and-what-problems-it-solves)
- [Overview Flow of AWS Mainframe Modernization](#overview-flow-of-aws-mainframe-modernization)
  - [Step 1: Input and Assessment](#step-1-input-and-assessment)
  - [Step 2: Processing and Transformation (Mainframe has two patterns)](#step-2-processing-and-transformation-mainframe-has-two-patterns)
  - [Step 3: Deployment and Operation](#step-3-deployment-and-operation)
- [Lab environment](#lab-environment)
  - [1. Replatform](#1-replatform)

Mind map:
![mindmap](./images/NotebookLM%20Mind%20Map.png)

# Why We Need This Service and What Problems It Solves

AWS Mainframe Modernization is needed because it addresses the complexity, cost, and agility challenges associated with traditional mainframes by facilitating a planned transition to modern cloud environments.

The problems and challenges solved by the service include:
1. Overcoming Legacy Technology and Code
*  The Problem: Mainframe applications often rely on legacy programming languages (like COBOL and Assembler), older transaction processing systems (like CICS), and specific data storage mechanisms (like VSAM, IMS DB, or Db2). Modernizing these components is complex.
* The Solution: AWS Mainframe Modernization offers automated tools to handle this transition.
    * Automated Refactoring converts legacy codebases into modern Java, solving the problem of aging languages and staff turnover (such as the COBOL knowledge gap).
    * Replatforming allows applications written in languages like COBOL or PL/I to run on cloud infrastructure while preserving the application logic, minimizing disruption to application knowledge and skills.
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
| Output (Transformed Code) | The legacy code is converted into a modern, multi-tier Java-based application. This process generates API-enabled backends and web-based frontends while preserving the original functional behavior | Blu Age Transformation Center |
| Development/ Testing     | Developers can refine and test the newly generated Java code                                                                                                                                         | Blu Age Developer IDE         |

2. Path B: Replatforming (Powered by Rocket Software/Micro Focus)

    This path preserves the original programming language and structure while moving the execution environment to the cloud.

| Component                | Description                                                                                                                                                          | Service Responsible                     |
|--------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------|
| Application Development  | Developers port the application with minimal code changes. Development tasks like smart editing, debugging, instant code compilation, and unit testing are performed | Rocket Developer IDE, VS Code, vim, ... |
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

# Lab environment

* Note: Before going to the lab, you should know that AWS Mainframe Modernization only supports specific kinds of legacy code.

* The overall AWS solution provides tools to analyze existing mainframe applications and develop or update them using COBOL or PL/I.
* Here is a breakdown of the languages and services supported, based on the specific modernization pattern:

1. Automated Refactoring (Powered by AWS Blu Age)

   The Refactoring pattern accelerates modernization by converting the legacy application stack into modern cloud-native code.
   * Source Legacy Languages/Services: Legacy codebases, often written in languages like COBOL, are the input for this pattern. It handles the conversion of legacy application programming languages.
   * Target Code Language: The legacy code is automatically converted into modern, multi-tier Java-based applications.
   * Target Architecture: The refactored application typically includes an Angular-based front-end and an API-enabled Java backend accessing modern data stores.
       • Transformation Tools: The AWS Blu Age Transformation Center automates this refactoring process.
2. Replatforming (Powered by Rocket Software Enterprise Suite)

   The Replatforming pattern migrates applications to the cloud while minimizing code changes.
   * Preserved Languages/Structures: This pattern focuses on preserving the application language, code, and artifacts. It enables organizations to migrate applications with minimal code changes, preserving existing programming languages and structures.
   * Supported Languages: The application source code, such as COBOL, is recompiled without changes, facilitating the movement to cloud-managed services.
   * Tools: This approach uses the Micro Focus Enterprise solution (now Rocket Software Enterprise Suite).
3. Supported Mainframe Languages and Services

   The sources highlight several specific languages, services, and artifacts common in mainframe environments that are addressed by the AWS modernization tools. A comprehensive example application (CardDemo) showcases these technologies:

| Mainframe Technology    | Category                | Role and Context in Modernization                                                                                                                                         |
|-------------------------|-------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| COBOL                   | Programming language    | The primary programming language supported and used for development/updates in AWS Mainframe Modernization. It is the core technology showcased in the sample application |
| PL/I                    | Programming language    | AWS Mainframe Modernization supports developing or updating applications using PL/I                                                                                       |
| CICS                    | Transaction processing  | Supported as the transaction processing environment in the legacy system                                                                                                  |
| JCL                     | Batch processing        | Used for batch processing and is a core technology in the source environment. The system also includes support for JCL Utilities (like FTP, DB2 LOAD/UNLOAD)              |
| VSAM (KSDS, ESDS, RRDS) | Data storage            | Supported data storage structures, including Key-Sequenced Data Sets (KSDS) with Alternate Indexes (AIX).                                                                 |
| Db2                     | Relational Database     | Supported as an optional technology for relational database management and integrated into modernization scenarios, including SQL operations and cursors.                 |
| IMS DB                  | Hierarchical Database   | Supported as an optional technology for hierarchical data storage.                                                                                                        |
| MQ                      | Message queue           | Supported as an optional feature for message queuing and asynchronous processing patterns.                                                                                |
| ASSEMBLER               | System-level Programming| Supported as a source language. Code conversion from assembler to COBOL is available (using mLogica).                                                                     |
| RACF                    | Security                | Supported as the security component.                                                                                                                                      |
| Data formats            | Complex structure       | The solution handles advanced data formats, including COMP, COMP-3, Zoned Decimal, Signed, and Unsigned formats.                                                          |
| Copybook Structures     | Data Definition         | Complex copybook structures like REDEFINES, OCCURS, and OCCURS DEPENDING ON are supported/handled                                                                         |

## 1. Replatform

Before you dive into the hands-on lab, please review the dedicated CardDemo replatform guide. It walks through deploying and running the sample mainframe application on the managed runtime.

- [CardDemo Replatform Lab Guide](labs/2.CardDemo/README.md)

Note: The CardDemo application and datasets used in this lab are sourced from the AWS sample repository: [aws-samples/aws-mainframe-modernization-carddemo](https://github.com/aws-samples/aws-mainframe-modernization-carddemo). This repository adapts that sample for demonstration purposes.