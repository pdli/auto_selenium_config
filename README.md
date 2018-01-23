**This main steps to configure one Propel Org Profile include:**
   
    step-1) extract required customer info from QRS system
  
    step-2) create service account in DirectoryWorks system
  
    step-3) assign this service account to org in QRS system
  
    step-4) generate required JSON files for further Propel profile configuration
  
    step-5) create org URL in Propel system
    
    step-6) configure Propel profiles, including: Catalogs/Categoires/Suppliers/Aggregation/Catalog Items

**Pre-requisite :**

---Dev IDE:
    
    1) Install Node js
    
    2) (Windows Only) git
    
    3) (Windows Only) Set npm proxy: https://jjasonclark.com/how-to-setup-node-behind-web-proxy/
    
    4) (Linux Only) Install google-Chrome browser with Yum
    
    5) (Windows Only) Install Browser Driver for phantomjs, and config PATH in PC. Ref to: http://www.seleniumhq.org/download/
    
    6) Install Browser Driver for chrome, and config PATH in PC. Ref to: http://www.seleniumhq.org/download/
 
---Git commands:

    1) Config ssh key in github server
    
    2) >> git clone [project]
    
    3) >> git submodule init & git submodule update

---Install packages:

    1) >> npm install    

---[Only for connection with prop-idm or ft1 server] 

     1. Add SSL cert into chrome browser:   

        >> openssl s_client -connect SERVER_DOMAIN:9000 </dev/null 

        >> copy output content from -----BEGIN CERTIFICATE----- to -----END CERTIFICATE-----

        >> cd /etc/ssl/certs

        >> create a new *.cert file (e.g. prople.cert) and paste content into it.

        >> certutil -d sql:$HOME/.pki/nssdb -L

        >> certutil -d sql:$HOME/.pki/nssdb -A -t "CP,," -n <certificate nickname> -i /etc/ssl/certs/propel.cert
     
      2. [Only for FT1 Server]
   
        1) [Linux] vim /etc/hosts     
            >> [vim] /etc/hosts
            >> [add] 15.140.130.82 pln-cd1-ewebportal.ft1core.mcloud.entsvcs.net
            >> unset http_proxy
            >> unset https_proxy       

        2) [Windows OS] 
            >> [cd ] C:\Windows\System32\drivers\etc\hosts     
            >> [add] 15.140.130.82 pln-cd1-ewebportal.ft1core.mcloud.entsvcs.net
            >> Direct connect setting for Browser

        3) edit config/config.json in scripts
            >> chromeNoProxy
            or
            >> chromeHeadlessNoProxy
         
**Here are main commands to run:**

  *one-step command (not-recommended):*  
     
      >> node propeltool.js runAll -t <tenantID> -D <debug> -J <jBilling ID> -R[re-run]
      
  *step-by-step commands:*
  
      >> [step 1-5]node propeltool.js runpartial -t <tenantID> -D <debug> -J <jBilling ID>
      >> [step 6]node propeltool.js configCatalog -t <tenantID> -D <debug> -J <jBilling ID> -R[re-run]
      >> [step 6 - revert command] node propeltool.js clearCatalog -t <tenantID> -D <debug>
      
      >> [step 5]node propeltool.js create -t <tenantID> -D <debug> -J <jBilling ID>
      >> [step 5-revert command] node propeltool.js remove -t <tenantID> -D <debug>       
      
**Commands to replace Class B certificate if needed:**

   *Web site to apply for Class B certificate: [https://mydigitalbadge.hpe.com][1]*
      
   *Commands to convert p12 to pem certs*
   
      >> cd cert
      >> openssl pkcs12 -in B-Certificattion.p12 -out cert.pem -clcerts -nokeys
      >> openssl pkcs12 -in B-Certificattion.p12 -out key.pem -nocerts -nodes
      
**Recommends :**

    1) Create one cron job to kill chrome related process daily/weekly/monthly
    

[1]: https://mydigitalbadge.hpe.com/
