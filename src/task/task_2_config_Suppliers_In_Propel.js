/**
 * Created by pengl on 5/11/2017.
 *
 * Function: Config catalog/categories/catalog Items for one org.
 *
 */

const WebDriverFactory = require('../../util/src/WebdriverFactory');
const WebDriverCommands = require('../../util/src/WebdriverCommands');
const PropelCommands = require('../../util/src/PropelCommands');
const config = require('../../config/config.json');
const By = require('selenium-webdriver').By;
const until = require('selenium-webdriver').until;
const path = require('path');

const PROPEL_SERVER = config.propelServer;
const TIMEOUT = config.propelElementTimeout;
const TIMEOUT_ORGCHECK = config.propelValidLoadingTime;

var log;
var driver;
var customerJson = {};
var webPromise;

/***********************************************************
 * Main Process
 * 1) Login Propel with Admin Account
 * 2) Read external file for further configuraton
 * 3) Run selenium process:
 * ****** Add Suppliers: MPC, SMC
 * ****** Aggregate Suppliers
 ***********************************************************/

function run( options ) {

    return new Promise(function(resovle, reject){


        setTraceLevel( options.debug );

        log.info("****** Method: Configure & Aggregate Suppliers in ProPel ******");

        customerJson = options.customerJson;

        startSelenium( resovle, reject);
    });
}

function startSelenium( resovle, reject ) {

    //Assign WebPromise, instead of native js promise
    driver = new WebDriverFactory( config.browser ).driver;

    webPromise =  PropelCommands.logInPropel(driver, PROPEL_SERVER, customerJson.urlName, customerJson.propelAccount, customerJson.propelPwd);

    webPromise
            .then( addSupplier_MPC )
            .then( addSupplier_SMC )
            .then( addSupplier_SOD )
            .then( addSupplier_SAP )
            .then( aggregate_MPC )
            .then( aggregate_SMC )
            .then( aggregate_SOD )
            .then( aggregate_SAP )
            .then( tearDown )
            .then( function() {

                resovle();
                log.info("===> Config & Aggregate Propel Suppliers Completed <===" );
            })
            .catch( function(err){ //check result

                PropelCommands.takeScreenShot(driver, "configSuppliers_snapshot_" + customerJson.urlName);
                //log.error( err );
                tearDown();
                reject( err );
            });
}

function setTraceLevel( debug ){

    const log4js = require('log4js');
    log4js.configure("./config/log4js.json");

    log = log4js.getLogger( debug );
}

function removeShadowPanel() {

    var cgBusyLocator = By.className('cg-busy-default-text ng-binding ng-scope');
    driver.wait(until.elementLocated( cgBusyLocator ), TIMEOUT);
    driver.wait(until.elementIsNotVisible( driver.findElement( cgBusyLocator)), TIMEOUT);
}

function aggregateOneSupplier( supplierName) {

    //go to Catalog Connect page
    var url = PROPEL_SERVER + ':9400/aggregation';
    PropelCommands.getPropelUrl( driver, url );
    driver.wait(until.titleContains('Catalog Connect'), TIMEOUT);

    //wait for full page loading
    var supplierLocator = By.xpath('//a[contains(text(), "'+ supplierName +'")]');
    driver.wait(until.elementLocated( supplierLocator ), TIMEOUT_ORGCHECK).then(
            function() {

                log.debug(" -> Supplier "+ supplierName + " already aggregated...");

            }, function create() { //add aggregation

                log.debug(' Aggregate Supplier -- ' + supplierName);

                //add aggregation
                var addLocator = By.id('add-button');
                WebDriverCommands.clickButton( driver, addLocator, TIMEOUT);

                var nameLocator = By.id('display-name');
                WebDriverCommands.sendKeysToInputElement(driver, nameLocator, supplierName + " Supplier", TIMEOUT);

                removeShadowPanel();

                var selectLocator = By.xpath('//span[@aria-label = "Select box activate"]');
                WebDriverCommands.clickButton( driver, selectLocator, TIMEOUT);

                var optionLocator = By.xpath('//span[contains(text(), "' + supplierName + '")]');
                WebDriverCommands.clickButton( driver, optionLocator, TIMEOUT);

                var saveLocator = By.id('add-aggregation-button');
                WebDriverCommands.clickButton(driver, saveLocator, TIMEOUT);

                //wait till save
                var aggregationListLocator = By.xpath('//h3[contains(text(), "Aggregation List")]');
                WebDriverCommands.waitElementLocated( driver, aggregationListLocator, TIMEOUT);
            }
    );
}

function aggregate_MPC() {

    aggregateOneSupplier( "MPC" );
}

function aggregate_SAP() {

    aggregateOneSupplier( 'SAP' );
}

function aggregate_SOD() {

    aggregateOneSupplier( 'SOD' );
}

function aggregate_SMC() {

    aggregateOneSupplier( "SMC" );
}

function gotoSupplierPage(){

    //go to add suppliers
    var url = PROPEL_SERVER + ':9400/suppliers';
    PropelCommands.getPropelUrl( driver, url );
    driver.wait(until.titleContains('Suppliers'), TIMEOUT);
}

function addSupplier_SAP() {

    gotoSupplierPage();

    //SAP supplier
    var supplierLocator = By.xpath('//a[contains(text(), "SAP")]');

    //wait for full page loading
    driver.wait(until.elementLocated( supplierLocator ), TIMEOUT_ORGCHECK).then(
            function(){
                log.debug(" -> SAP Supplier already existed...");
            },
            function create() {//not existed, create one

                var addLocator = By.xpath('//a[contains(text(), "Add Supplier")]');
                WebDriverCommands.clickButton(driver, addLocator, TIMEOUT);

                log.debug(" Create SAP Supplier...");

                add_basic_supplier_properties( 'SAP' );

                add_catalog_jbilling_APIs_for_SAP_supplier();

                add_lvm_APIs_for_supplier();

                add_rws_for_SAP_supplier();

                add_org_for_SAP_supplier();

                add_storage_for_SAP_supplier();

                //Create Button
                var createBtnLocator = By.id('add-backend-system-button');
                WebDriverCommands.clickButton( driver, createBtnLocator, TIMEOUT);

                //wait for save completion
                var editLocator = By.id('edit-provider-button');
                WebDriverCommands.waitElementLocated(driver, editLocator, TIMEOUT);
            });
}

function add_storage_for_SAP_supplier() {

    var templateNameLocator = By.name('storageChangeTemplateName');
    WebDriverCommands.sendKeysToInputElement( driver, templateNameLocator, 'ECS-STORAGE - SAN DISK AMS ONLY', TIMEOUT);

    var configItemLocator = By.name('storageConfigItems');
    WebDriverCommands.sendKeysToInputElement( driver, configItemLocator, 'generic-infrastructure-ci (ecs)', TIMEOUT);

    var supervisorWorkGroupLocator = By.name('storageSupervisorWorkGroup');
    WebDriverCommands.sendKeysToInputElement( driver, supervisorWorkGroupLocator, 'W-CHGSUP-ECS-SAN', TIMEOUT);

    var userIDLocator = By.name('storageUserId');
    WebDriverCommands.sendKeysToInputElement( driver, userIDLocator, 'dxc-managedcloud-ticketing-concierge@dxc.com', TIMEOUT);

    var requestedByIDLocator = By.name('storageRequestedById');
    WebDriverCommands.sendKeysToInputElement( driver, requestedByIDLocator, 'dxc-managedcloud-ticketing-concierge@dxc.com', TIMEOUT);

    var coordinatorWorkGroupLocator = By.name('storageCoordinatorWrokGroup');
    WebDriverCommands.sendKeysToInputElement( driver, coordinatorWorkGroupLocator, 'N-CHGIMP-ECS-SAN-L3', TIMEOUT);

    var companyIDLocator = By.name('storageCompanyId');
    WebDriverCommands.sendKeysToInputElement( driver, companyIDLocator, 'ECS', TIMEOUT);

    var storageManagementRegionLocator = By.name('storageManagementRegion');
    WebDriverCommands.sendKeysToInputElement( driver, storageManagementRegionLocator, 'North America', TIMEOUT);

    var managementRegionLocator = By.name('managementRegion');
    WebDriverCommands.sendKeysToInputElement( driver, managementRegionLocator, 'North America', TIMEOUT);
}

function add_org_for_SAP_supplier() {

    var sapTenantIDLocator = By.name('tenantId');
    WebDriverCommands.sendKeysToInputElement( driver, sapTenantIDLocator, customerJson.tenantID, TIMEOUT);
}

function add_rws_for_SAP_supplier() {

    //RWS for SAP only
    var validateChangeTemplateNameLocator = By.name('validateChangeTemplateName');
    WebDriverCommands.sendKeysToInputElement( driver, validateChangeTemplateNameLocator, 'ECSO-VPC-R-E4S-PROV - SAP SERVER PROVISIONING', TIMEOUT);

    var validateConfigItemsLocator = By.name('validateConfigItems');
    WebDriverCommands.sendKeysToInputElement( driver, validateConfigItemsLocator, 'generic-infrastructure-ci (ecs)', TIMEOUT);

    var validateSupervisorWorkGroupLocator = By.name('validateSupervisorWorkGroup');
    WebDriverCommands.sendKeysToInputElement( driver, validateSupervisorWorkGroupLocator, 'W-CHGSUP-ECS-PROV', TIMEOUT);

    var validateUserIdLocator = By.name('validateUserId');
    WebDriverCommands.sendKeysToInputElement( driver, validateUserIdLocator, 'dxc-managedcloud-ticketing-concierge@dxc.com', TIMEOUT);

    var validateRequestedByIdLocator = By.name('validateRequestedById');
    WebDriverCommands.sendKeysToInputElement( driver, validateRequestedByIdLocator, 'dxc-managedcloud-ticketing-concierge@dxc.com', TIMEOUT);

    var validateCoordinatorWrokGroupLocator = By.name('validateCoordinatorWrokGroup');
    WebDriverCommands.sendKeysToInputElement( driver, validateCoordinatorWrokGroupLocator, 'W-CHGMGR-ECS-PROV', TIMEOUT);

    var validateCompanyIdLocator = By.name('validateCompanyId');
    WebDriverCommands.sendKeysToInputElement( driver, validateCompanyIdLocator, 'ECS', TIMEOUT);

    var validateManagementRegionLocator = By.name('validateManagementRegion');
    WebDriverCommands.sendKeysToInputElement( driver, validateManagementRegionLocator, 'North America', TIMEOUT);

    var hmcoTemplateLocator = By.name('hmcoChangeTemplateName');
    WebDriverCommands.sendKeysToInputElement( driver, hmcoTemplateLocator, 'ECSO-VPC-R-E4S-PROV - SAP SERVER PROVISIONING', TIMEOUT);

    var hmcoConfigItemsLocator = By.name('hmcoConfigItems');
    WebDriverCommands.sendKeysToInputElement( driver, hmcoConfigItemsLocator, 'generic-infrastructure-ci (ecs)', TIMEOUT);

    var hmcoSupervisorWGLocator = By.name('hmcoSupervisorWorkGroup');
    WebDriverCommands.sendKeysToInputElement( driver, hmcoSupervisorWGLocator, 'W-CHGSUP-ECS-PROV', TIMEOUT);

    var hmcoUserIdLocator = By.name('hmcoUserId');
    WebDriverCommands.sendKeysToInputElement( driver, hmcoUserIdLocator, 'dxc-managedcloud-ticketing-concierge@dxc.com', TIMEOUT);

    var hmcoRequestedIdLocator = By.name('hmcoRequestedById');
    WebDriverCommands.sendKeysToInputElement( driver, hmcoRequestedIdLocator, 'dxc-managedcloud-ticketing-concierge@dxc.com', TIMEOUT);

    var hmcoCoordinatorWGLocator = By.name('hmcoCoordinatorWrokGroup');
    WebDriverCommands.sendKeysToInputElement( driver, hmcoCoordinatorWGLocator, 'W-CHGMGR-ECS-PROV', TIMEOUT);

    var hmcoCompanyIdLocator = By.name('hmcoCompanyId');
    WebDriverCommands.sendKeysToInputElement( driver, hmcoCompanyIdLocator, 'ECS', TIMEOUT);

    var hmcoManagementRegionLocator = By.name('hmcoManagementRegion');
    WebDriverCommands.sendKeysToInputElement( driver, hmcoManagementRegionLocator, customerJson.management_reg, TIMEOUT);

    //DR
    var drChangeTemplateNameLocator = By.name('drChangeTemplateName');
    WebDriverCommands.sendKeysToInputElement( driver, drChangeTemplateNameLocator, 'CONTINUITY SERVICES SAP CAPACITY REQUEST', TIMEOUT);

    var drConfigItemsLocator = By.name('drConfigItems');
    WebDriverCommands.sendKeysToInputElement( driver, drConfigItemsLocator, 'generic-infrastructure-ci (ecs)', TIMEOUT);

    var drSupervisorWGLocator = By.name('drSupervisorWorkGroup');
    WebDriverCommands.sendKeysToInputElement( driver, drSupervisorWGLocator, 'N-CHGSUP-HP-FACILITIES-HELION-HPCS', TIMEOUT);

    var drUserIdLocator = By.name('drUserId');
    WebDriverCommands.sendKeysToInputElement( driver, drUserIdLocator, 'DXC-MANAGEDCLOUD-TICKETING-CONCIERGE@GROUPS.INT.HPE.COM', TIMEOUT);

    var drRequestedIdLocator = By.name('drRequestedById');
    WebDriverCommands.sendKeysToInputElement( driver, drRequestedIdLocator, 'DXC-MANAGEDCLOUD-TICKETING-CONCIERGE@GROUPS.INT.HPE.COM', TIMEOUT);

    var drCoordinatorWGLocator = By.name('drCoordinatorWrokGroup');
    WebDriverCommands.sendKeysToInputElement( driver, drCoordinatorWGLocator, 'N-CHGMGR-HP-FACILITIES-HELION-HPCS', TIMEOUT);

    var drCompanyIdLocator = By.name('drCompanyId');
    WebDriverCommands.sendKeysToInputElement( driver, drCompanyIdLocator, 'HP', TIMEOUT);

    //EAO
    var eaoTemplateNameLocator = By.name('eaoChangeTemplateName');
    WebDriverCommands.sendKeysToInputElement( driver, eaoTemplateNameLocator, 'ECSO-VPC-R-ESO4SAP SID ORDER', TIMEOUT);

    var eaoConfigItemsLocator = By.name('eaoConfigItems');
    WebDriverCommands.sendKeysToInputElement( driver, eaoConfigItemsLocator, 'generic-infrastructure-ci (ecs)', TIMEOUT);

    var eaoSupervisorWGLocator = By.name('eaoSupervisorWorkGroup');
    WebDriverCommands.sendKeysToInputElement( driver, eaoSupervisorWGLocator, 'W-CHGSUP-GDO-PG-SAP', TIMEOUT);

    var eaoUserIdLocator = By.name('eaoUserId');
    WebDriverCommands.sendKeysToInputElement( driver, eaoUserIdLocator, 'dxc-managedcloud-ticketing-concierge@dxc.com', TIMEOUT);

    var eaoRequestedIdLocator = By.name('eaoRequestedById');
    WebDriverCommands.sendKeysToInputElement( driver, eaoRequestedIdLocator, 'dxc-managedcloud-ticketing-concierge@dxc.com', TIMEOUT);

    var eaoCoordinatorWGLocator = By.name('eaoCoordinatorWrokGroup');
    WebDriverCommands.sendKeysToInputElement( driver, eaoCoordinatorWGLocator, 'W-CHGMGR-GDO-PG-SAP', TIMEOUT);

    var eaoCompanyIdLocator = By.name('eaoCompanyId');
    WebDriverCommands.sendKeysToInputElement( driver, eaoCompanyIdLocator, 'ECS', TIMEOUT);

    var eaoManagementRegionLocator = By.name('managementRegion');
    WebDriverCommands.sendKeysToInputElement( driver, eaoManagementRegionLocator, 'North America', TIMEOUT);
}

function add_lvm_APIs_for_supplier(){

    //LVM Resource Management API
    var endpointLocator = By.name('endpointResLvm');
    WebDriverCommands.sendKeysToInputElement( driver, endpointLocator, 'https://atcswa-cr-atlassian.ecs-core.ssn.hp.com:8132', TIMEOUT);

    var authorizationLocator = By.name('authResLvm');
    WebDriverCommands.sendKeysToInputElement( driver, authorizationLocator, 'Basic c29kYWRtaW46KjhpdEMhZGckMkc=', TIMEOUT);
}

function add_catalog_jbilling_APIs_for_SAP_supplier(){

    //Catalog API
    var endpointLocator = By.name('endpoint');
    WebDriverCommands.sendKeysToInputElement(driver, endpointLocator, 'https://localhost:9444/api-service', TIMEOUT);

    //JBilling API
    var billingEndLocator = By.name('billingEndpoint');
    WebDriverCommands.sendKeysToInputElement(driver, billingEndLocator, 'http://atc-cr-jbapp2.mcloud.svcs.hpe.com/jbilling', TIMEOUT);

    var billingLognameLocator = By.name('billingLoginName');
    WebDriverCommands.sendKeysToInputElement(driver, billingLognameLocator, 'propel;70', TIMEOUT);

    var billingPwdLocator = By.name('billingPassword');
    WebDriverCommands.sendKeysToInputElement(driver, billingPwdLocator, 'tiP3PuZ4k7En9SKFL/Cd0NwMunkqU+YgGz39adB', TIMEOUT);

    var billingCusIDLocator = By.name('billingCustomerId');
    WebDriverCommands.sendKeysToInputElement(driver, billingCusIDLocator, customerJson.billingID, TIMEOUT);

    var billingCurrencyLocator = By.name('billingCurrencyCode');
    WebDriverCommands.sendKeysToInputElement(driver, billingCurrencyLocator, customerJson.homeCurrency, TIMEOUT);
}

function addSupplier_SOD() {

    gotoSupplierPage();

    //SOD supplier
    var supplierLocator = By.xpath('//a[contains(text(), "SOD")]');

    //wait for full page loading
    driver.wait(until.elementLocated( supplierLocator ), TIMEOUT_ORGCHECK).then(
            function(){
                log.debug(" -> SOD Supplier already existed...");
            },
            function create() {//not existed, create one

                var addLocator = By.xpath('//a[contains(text(), "Add Supplier")]');
                WebDriverCommands.clickButton(driver, addLocator, TIMEOUT);

                log.debug(" Create SOD Supplier...");

                add_basic_supplier_properties( 'SOD' );

                add_customer_tenant_for_MPC_supplier();

		        add_lvm_APIs_for_supplier();

                add_catalog_v2_jbilling_APIs_for_supplier();

                add_irim_API_for_supplier();

                add_v3token_for_supplier();

                add_rws_for_SOD_supplier();

                //Create Button
                var createBtnLocator = By.id('add-backend-system-button');
                WebDriverCommands.clickButton( driver, createBtnLocator, TIMEOUT);

                //wait for save completion
                var editLocator = By.id('edit-provider-button');
                WebDriverCommands.waitElementLocated( driver, editLocator, TIMEOUT);
            });
}

function addSupplier_SMC() {

    gotoSupplierPage();

    //SMC supplier
    var supplierLocator = By.xpath('//a[contains(text(), "SMC")]');
    //wait for full page loading
    driver.wait(until.elementLocated( supplierLocator ), TIMEOUT_ORGCHECK).then(
            function(){
                log.debug(" -> SMC Supplier already existed...");
            },
            function create() {//not existed, create one

                var addLocator = By.xpath('//a[contains(text(), "Add Supplier")]');
                WebDriverCommands.clickButton( driver, addLocator, TIMEOUT);

                log.debug(" Create SMC Supplier...");

                add_basic_supplier_properties( 'SMC' );

                add_customer_tenant_for_SMC_supplier();

                add_catalog_v2_jbilling_APIs_for_supplier();

                add_rws_for_SMC_supplier();

                //Create Button
                var createBtnLocator = By.id('add-backend-system-button');
                WebDriverCommands.clickButton( driver, createBtnLocator, TIMEOUT);

                //wait for save completion
                var editLocator = By.id('edit-provider-button');
                WebDriverCommands.waitElementLocated(driver, editLocator, TIMEOUT);
            });
}

function add_rws_for_SOD_supplier(){

    //RWS
    var companyLocator = By.name('companyCode');
    //driver.findElement( companyLocator ).sendKeys( customerJson.companyCode );
    WebDriverCommands.sendKeysToInputElement( driver, companyLocator, "ECS", TIMEOUT);

    var rwsAPILocator = By.name('urlRwsApiEndpoint');
    WebDriverCommands.sendKeysToInputElement( driver, rwsAPILocator, 'https://atc-cr-SM9-SM.mcloud.svcs.hpe.com:8443', TIMEOUT);

    var locationIdLocator = By.name('locationId');
    WebDriverCommands.sendKeysToInputElement( driver, locationIdLocator, customerJson.customer_loc, TIMEOUT);

    var managementRegLocator = By.name('managementRegion');
    WebDriverCommands.sendKeysToInputElement( driver, managementRegLocator, customerJson.management_reg, TIMEOUT);

    var requestEmailLocator = By.name('requestedEmail');
    WebDriverCommands.sendKeysToInputElement( driver, requestEmailLocator, customerJson.ticket_email, TIMEOUT);

    //var smInstanceLocator = By.name('smInstance');
    //driver.findElement( smInstanceLocator ).sendKeys(  );
}

function add_rws_for_SMC_supplier(){

    //RWS
    var companyLocator = By.name('companyCode');
    //driver.findElement( companyLocator ).sendKeys( customerJson.companyCode );
    WebDriverCommands.sendKeysToInputElement( driver, companyLocator, "ECS", TIMEOUT);

    var on_boardingAPILocator = By.name('urlOnboardingApiEndpoint');
    WebDriverCommands.sendKeysToInputElement( driver, on_boardingAPILocator, 'https://15.163.20.34:8443', TIMEOUT);

    var rwsAPILocator = By.name('urlRwsApiEndpoint');
    WebDriverCommands.sendKeysToInputElement( driver, rwsAPILocator, 'https://15.163.20.34:8443', TIMEOUT);

    var locationIdLocator = By.name('locationId');
    //WebDriverCommands.sendKeysToInputElement( driver, locationIdLocator, customerJson.customer_loc, TIMEOUT);
    WebDriverCommands.sendKeysToInputElement( driver, locationIdLocator, "None", TIMEOUT);

    var managementRegLocator = By.name('managementRegion');
    //WebDriverCommands.sendKeysToInputElement( driver, managementRegLocator, customerJson.management_reg, TIMEOUT);
    WebDriverCommands.sendKeysToInputElement( driver, managementRegLocator, "North America", TIMEOUT);

    var requestEmailLocator = By.name('requestedEmail');
    //WebDriverCommands.sendKeysToInputElement( driver, requestEmailLocator, customerJson.ticket_email, TIMEOUT);
    WebDriverCommands.sendKeysToInputElement( driver, requestEmailLocator, "dxc-managedcloud-ticketing-concierge@dxc.com", TIMEOUT);

    //var smInstanceLocator = By.name('smInstance');
    //WebDriverCommands.sendKeysToInputElement( driver, smInstanceLocator, "AMS", TIMEOUT);
    //driver.findElement( smInstanceLocator ).sendKeys(  );
}

function add_basic_supplier_properties( supplier_type ) {

    //Basic Supplier Properties
    var displayLocator = By.id('display-name');
    WebDriverCommands.sendKeysToInputElement( driver, displayLocator, supplier_type + " Supplier", TIMEOUT);

    var backendLocator = By.xpath('//select[@id = "system-type"]/option[text() = "'+ supplier_type +'"]');
    WebDriverCommands.clickButton( driver, backendLocator, TIMEOUT);

    var pricingLocator = By.xpath('//select[@id = "sx-pricing-instance-select"]/option[text() = "Self"]');
    WebDriverCommands.clickButton( driver, pricingLocator, TIMEOUT);

    var validationLocator = By.xpath('//select[@id= "sx-validation-instance-select"]/option[text() = "Self"]');
    WebDriverCommands.clickButton( driver, validationLocator, TIMEOUT);
}

function add_customer_tenant_for_MPC_supplier() {

    var customerIdLocator = By.name('tenantId');
    WebDriverCommands.sendKeysToInputElement( driver, customerIdLocator, customerJson.tenantID, TIMEOUT);

    var dcLocator = By.name('dcName');
    WebDriverCommands.sendKeysToInputElement( driver, dcLocator, customerJson.prime_data_center, TIMEOUT);

    var compartmentLocator = By.name('compartmentConfig');
    WebDriverCommands.sendKeysToInputElement( driver, compartmentLocator, JSON.stringify( customerJson.compartments ), TIMEOUT);

    var defaultComLocator = By.name('defaultCompartmentName');
    WebDriverCommands.sendKeysToInputElement( driver, defaultComLocator, customerJson.prime_DC_location, TIMEOUT);
}

function add_customer_tenant_for_SMC_supplier() {

    //Customer(Tenant)
    var customerIdLocator = By.name('tenantId');
    WebDriverCommands.sendKeysToInputElement( driver, customerIdLocator, customerJson.tenantID, TIMEOUT);

    var dcLocator = By.name('dcName');
    WebDriverCommands.sendKeysToInputElement( driver, dcLocator, customerJson.prime_data_center, TIMEOUT);

    var compartmentLocator = By.name('compartmentConfig');
    WebDriverCommands.sendKeysToInputElement( driver, compartmentLocator, JSON.stringify( customerJson.compartments ), TIMEOUT);
}

function add_catalog_v2_jbilling_APIs_for_supplier() {

    //Catalog API
    var endpointLocator = By.name('endpoint');
    WebDriverCommands.sendKeysToInputElement( driver, endpointLocator, 'https://localhost:9444/api-service', TIMEOUT);

    //V2 API
    var v2EndpointLocator = By.name('endpointv2');
    WebDriverCommands.sendKeysToInputElement( driver, v2EndpointLocator, 'https://ecsportal.ecs-core.ssn.hp.com/v2', TIMEOUT);

    var v2LognameLocator = By.name('loginName');
    WebDriverCommands.sendKeysToInputElement( driver, v2LognameLocator, customerJson.serviceAccount, TIMEOUT);

    var v2PasswordLocator = By.name('password');
    WebDriverCommands.sendKeysToInputElement( driver, v2PasswordLocator, customerJson.servicePwd, TIMEOUT);

    //JBilling API
    var billingEndLocator = By.name('billingEndpoint');
    WebDriverCommands.sendKeysToInputElement( driver, billingEndLocator, 'http://atc-cr-jbapp2.mcloud.svcs.hpe.com/jbilling', TIMEOUT);

    var billingLognameLocator = By.name('billingLoginName');
    WebDriverCommands.sendKeysToInputElement( driver, billingLognameLocator, 'propel;70', TIMEOUT);

    var billingPwdLocator = By.name('billingPassword');
    WebDriverCommands.sendKeysToInputElement( driver, billingPwdLocator, 'tiP3PuZ4k7En9SKFL/Cd0NwMunkqU+YgGz39adB', TIMEOUT);

    var billingCusIDLocator = By.name('billingCustomerId');
    WebDriverCommands.sendKeysToInputElement( driver, billingCusIDLocator, customerJson.billingID, TIMEOUT);

    var billingCurrencyLocator = By.name('billingCurrencyCode');
    WebDriverCommands.sendKeysToInputElement( driver, billingCurrencyLocator, customerJson.homeCurrency, TIMEOUT);
}

function add_irim_API_for_supplier() {

    //IRIM API
    var irimEndLocator = By.name('irimEndpoint');
    WebDriverCommands.sendKeysToInputElement( driver, irimEndLocator, 'https://15.163.20.36:9444/irim', TIMEOUT);

    var irimIdLocator = By.name('irimCustomerId');
    WebDriverCommands.sendKeysToInputElement( driver, irimIdLocator, '90', TIMEOUT);
}

function add_v3token_for_supplier() {

    //v3Token
    var v3TokenLocator = By.name('v3TokenEndpoint');
    WebDriverCommands.sendKeysToInputElement( driver, v3TokenLocator, 'https://15.163.20.15:35357/v3/auth/tokens', TIMEOUT);

    var v3UsernameLocator = By.name('v3TokenUserName');
    WebDriverCommands.sendKeysToInputElement( driver, v3UsernameLocator, 'propel_token', TIMEOUT);

    var v3PasswordLocator = By.name('v3TokenPassword');
    WebDriverCommands.sendKeysToInputElement( driver, v3PasswordLocator, 'K@zhtJ2knma9', TIMEOUT);

    var v3VpcUserIdLocator = By.name('v3TokenVpcUserId');
    WebDriverCommands.sendKeysToInputElement( driver, v3VpcUserIdLocator, customerJson.tenantID, TIMEOUT);
}

function addSupplier_MPC() {

    gotoSupplierPage();

    //MPC supplier
    var supplierLocator = By.xpath('//a[contains(text(), "MPC")]');
    //wait for full page loading
    driver.wait(until.elementLocated( supplierLocator ), TIMEOUT_ORGCHECK).then(
            function(){
                log.debug(" -> MPC Supplier already existed...");
            },
            function create() {//not existed, create one

                var addLocator = By.xpath('//a[contains(text(), "Add Supplier")]');
                WebDriverCommands.clickButton( driver, addLocator, TIMEOUT);

                log.debug(" Create MPC Supplier...");

                add_basic_supplier_properties( 'MPC' );

                add_customer_tenant_for_MPC_supplier();

                add_catalog_v2_jbilling_APIs_for_supplier();

                add_irim_API_for_supplier();

                add_v3token_for_supplier();

                //Create Button
                var createBtnLocator = By.id('add-backend-system-button');
                WebDriverCommands.clickButton( driver, createBtnLocator, TIMEOUT);

                //wait for save completion
                var editLocator = By.id('edit-provider-button');
                WebDriverCommands.waitElementLocated( driver, editLocator, TIMEOUT);
            });

}

function tearDown() {
    driver.quit();
    webPromise.cancel();
}

module.exports = {

    run : run
}
