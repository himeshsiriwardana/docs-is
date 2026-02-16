# Deploy WSO2 Identity Server

This section guides you through deploying **WSO2 Identity Server** in production, from planning your architecture to operating and maintaining a reliable deployment.

Use the pages in order if you’re deploying **WSO2 Identity Server** for the first time. If you already have a running environment, jump to the chapter that matches what you need next.

---

## What you’ll achieve

By the end of this guide, you’ll be able to:

- Design a production-ready deployment (network, databases, user store, high availability).
- Deploy **WSO2 Identity Server** on your chosen platform (virtual machines or Kubernetes).
- Harden and optimize the deployment for security and performance.
- Monitor, maintain, and safely promote changes across environments.

---

## Before you begin

Production reliability starts with clear architectural decisions. Review the following considerations before proceeding:

- **Network placement**: Determine where the server will run (private network or DMZ) and which endpoints will be exposed publicly.

- **High availability**: Decide whether the deployment must support clustering and failover from day one.

- **User store**: Select the appropriate user store (LDAP/Active Directory or JDBC) and define its location and connectivity.

- **Database strategy**: Plan your database layout, including schema separation and operational boundaries.

- **Deployment platform**: Choose your target environment (virtual machines, Kubernetes, OpenShift, or managed cloud).

If you haven't finalized these decisions, begin with Plan your deployment to design a secure and scalable architecture.

If you’re not sure yet, start with **Plan your deployment**.

---

## The deployment journey

### 1. Plan your deployment

Start here to design a secure, scalable architecture before touching configuration files.

- Where to deploy **WSO2 Identity Server** (LAN/DMZ model)  
- Security best practices for deployment  
- Choose a deployment pattern (Single node vs high availability, clustering, multi-region)

**Next:** Choose prerequisites (hardware, databases, user store).

---

### 2. Prepare prerequisites

Set up the foundations that **WSO2 Identity Server** depends on in production.

- Hardware and capacity planning  
- Choose and configure the user store  
- Plan and set up databases  

**Next:** Choose your deployment platform.

---

### 3. Choose your deployment platform

Pick the deployment model that fits your environment and operations.

- Deploy on virtual machines  
- Deploy on Kubernetes  
- Deploy on OpenShift  

**Next:** Configure a production-ready first node.

---

### 4. Configure the server for production

Establish a reliable baseline configuration before scaling out.

- Configuration basics (`deployment.toml`)  
- Databases and connection pools  
- Keystores, truststores, and certificates  
- Encrypt secrets  

**Next:** Make it highly available (if required).

---

### 5. Scale with high availability and clustering

Add more nodes and ensure consistency across the cluster.

- Load balancing and reverse proxy  
- Clustering and Hazelcast  
- Databases for clustering  
- Artifact synchronization (if applicable)  

**Next:** Tune performance and apply hardening.

---

### 6. Optimize performance

Improve throughput and stability under real production load.

- Performance tuning recommendations  
- Caches and related performance settings  

---

### 7 Secure your deployment

Lock down management access and reduce your attack surface.

- Restrict public access to management operations  
- Production security guidelines  

---

### 8. Monitor and operate

Make the deployment observable and operationally safe.

- Monitoring **WSO2 Identity Server**  
- Mask sensitive information in logs  
- Health checks  

---

### 9. Maintain and promote changes safely

Keep the system healthy over time and reduce deployment risk.

- Backup and recovery recommendations  
- Renew certificates  
- Updates and patching  
- Promote configurations across environments  

---

### Suggested paths for deployment

- **Deploying WSO2 Identity Server in production for the first time**: Plan → Prerequisites → Platform → Configure → High availability/Clustering → Performance → Security → Monitoring → Maintenance

- **Already have a single node and need high availability**: High availability/Clustering → Databases for clustering → Load balancing → Monitoring

- **Deploying on Kubernetes**: Platform (Kubernetes) → Configure → High availability/Clustering → Performance → Security → Monitoring

- **Preparing for production readiness review**: Plan → Security → Monitoring → Maintenance → Promotion

---

## How to use this section

This section contains both step-by-step guides and reference pages. Follow the journey if you are new to production deployment, and use individual pages as references when you need configuration specifics.
