/**
 * Created by pengl on 2/13/2017.
 * Description: This script distill customer info from QRS. tenantID is required.
 * Parameters : cusInfoObj.tenantID
 * Outputs    : primary data saved in data storage
 */

const WebDriverFactory = require('../util/src/WebdriverFactory');
const PropelCommands = require('../util/src/PropelCommands');
const PropelFileManagementAPI = require('./api/PropelFileManagement');
const cfgJson = require('../config/config.json');
const jen = require('node-jen'); //strong servicePwd generator

//selenium-webDriver instance
const By = require('selenium-webdriver').By;
const until = require('selenium-webdriver').until;

//uRL
const QRS_Server = cfgJson.qrsServer;
const TIMEOUT = 30000;

//variables
var log;
var DC_LIST_JSON = {};
var driver;
var g_QRSAccount, g_QRSPwd;
var cusInfoObj = {tenantID: "", dataCenter:[], customerDCLocations:{}};
var vpcToken = '';
var promise;

/*************************************************************************
 * Main Processes
 * 1) get tenant ID from config file
 * 2) Log in QRS
 * 3) Go to pages, extractData info
 * 4) Save raw data in primary data storage
***************************************************************************/

function run( options ) { //tenantID, username, password, debug) {
    return new Promise(function(resolve,reject){

        setUp( options );

        log.info("***** Step - 1: Extract Customer Info From QRS by Tenant ID ******");

        promise = loginQRS();

        promise
                //.then( loginQRS )
                .then( getVpcToken )
                .then( validTenantID_ViewCustomer )
                .then( extractCommonInfo_ViewCustomer )
                .then( extractDCInfo_AssignDataCenter )
                .then( extractCustomerLocation_ESM )
                .then( extractContactEmail_ContactManagement )
                .then( extractCompanyCode_ESM )
                .then( displayAndWriteCusInfo )
                .then( tearDown )
                .then(function(){
                    resolve();
                })
                .catch( function( errback) {

                    PropelCommands.takeScreenShot( driver, 'extract_info_QRS_snapshot');
                    console.error( errback );
                    tearDown();
                    //reject();
                });
    });
}

function setUp( options ) {

    //set trace level: info by default.
    const log4js = require('log4js');
    log4js.configure("./config/log4js.json");
    log = log4js.getLogger( options.debug);

    //initialize
    cusInfoObj.tenantID = options.tenantID;
    g_QRSAccount = options.username;
    g_QRSPwd = options.password;

    //get driver
    driver = new WebDriverFactory('phantomJsC').driver;
    //driver = new WebDriverFactory('chrome').driver;

    DC_LIST_JSON = cfgJson.datacenters;
    log.trace("==> Supplied Data Centers Information includes ==> ");
    log.trace(DC_LIST_JSON);
}

function tearDown() {

    promise.cancel();
    driver.quit();
}

function displayAndWriteCusInfo() {

    generatePropelAccount();    
    generateServiceAccount();

    // only for propel URL
    str = cusInfoObj.customerName;
    str = str.toLowerCase();
    str = str.replace(/ |-|_/g, '-');
    str = str.replace(/-+/g, '-');
    //str = str.replace(/ - /g, '-');
    //str = str.replace(/ |_/g, '-');
    cusInfoObj.urlName = str;

    log.info('==> Distilled Customer Information is: <== ');
    log.info(cusInfoObj);

    PropelFileManagementAPI.writeToPrimaryDataStorage( cusInfoObj );
}

function generateServiceAccount() {
    var str = cusInfoObj.customerName;
    str = str.toLowerCase();
    str = str.replace(/ /g, '');
    str = str.replace(/\.$/, '');
    cusInfoObj.serviceAccount = str + '@' + str + '.com';
    cusInfoObj.servicePwd = '!!qwer34QAZZ';
}

function generatePropelAccount() {
    var str = cusInfoObj.customerName;
    str = str.toLowerCase();
    str = str.replace(/ /g, '');
    cusInfoObj.propelPwd = 'propel@' + str;
    cusInfoObj.propelAccount = 'migration';
}

function loginWithAccount(){

    //login with username & password
    driver.findElement(By.name('USER')).sendKeys( g_QRSAccount );
    driver.findElement(By.name('PASSWORD')).sendKeys( g_QRSPwd );
    driver.findElement(By.xpath("//input[@value = 'Log on']")).click();
}

function loginWithDigitalBadge() {

    //using classB certificate for automatically login
    var badgeLocator = By.name('digBadgeAnchor');
    driver.wait(until.elementLocated( badgeLocator ), TIMEOUT);
    driver.wait(until.elementIsEnabled(driver.findElement( badgeLocator)), TIMEOUT);
    driver.findElement( badgeLocator ).click();
}

function loginQRS() {

    driver.get( QRS_Server + '/ucs/internal/home.do' );
    driver.wait(until.titleContains("HP SiteMinder Login"), TIMEOUT);

    loginWithDigitalBadge();

    return driver.wait(until.titleContains('Flexible Computing'), TIMEOUT);
}

function getVpcToken() {

    var viewLocator = By.xpath("//div/a[contains(text(), 'View Customer') and contains(@href, 'vpc_global_token')]");
    driver.wait(until.elementLocated(viewLocator), TIMEOUT);
    driver.findElement( viewLocator ).getAttribute('href').then( function(url) {
        vpcToken = url.substr(url.lastIndexOf('=') + 1 );
        log.debug(" QRS URL is: " + url);
        log.debug(" VPC token is: " + vpcToken);
    });
}


function validTenantID_ViewCustomer() {

    //If TenantID does NOT exist, quit the process.
    var url = QRS_Server + '/ucs/internal/selectCustomerProfile.do?CUSTID=' + cusInfoObj.tenantID + '&vpc_global_token=' + vpcToken;
    driver.get(url);

    var nameLocator = By.name('customerName');
    driver.wait(until.elementLocated( nameLocator ), TIMEOUT);
    driver.findElement( nameLocator ).getAttribute('value').then( function(x) {
       if(x === '') {
           throw new Error('Wrong TenantID: ' + cusInfoObj.tenantID
                   + '. Please check your input.');
       }
    });
}

function extractCommonInfo_ViewCustomer() {

    var url = QRS_Server + '/ucs/internal/selectCustomerProfile.do?CUSTID=' + cusInfoObj.tenantID + '&vpc_global_token=' + vpcToken;
    driver.get(url);

    //get customerName
    var customerLocator = By.name('customerName');
    driver.wait(until.elementLocated( customerLocator ), TIMEOUT);
    driver.findElement( customerLocator ).getAttribute('value').then(function (x) {
        cusInfoObj.customerName = x;
    });

    //get customerCity
    driver.findElement(By.name('city')).getAttribute('value').then(function (x) {

        cusInfoObj.customerCity = x;
        if( x.length <1 ){
            cusInfoObj.customerCity = "None";
        }
    });

    //get customerCurrency - option 1: 100123
    var currencyLocator = By.xpath("//input[@name = 'taxExemptPrefCurrency']/parent::td");
    driver.findElements( currencyLocator ).then( function( elements ){

        if( elements.length > 0) {
            driver.findElement( currencyLocator ).getText().then(  function (x) {
                cusInfoObj.homeCurrency = x;
                log.debug(' Home Currency is: ' + cusInfoObj.homeCurrency);
            });
        }
    });

    //get customerCurrency - option 2 : 100772
    var currencyLocator_2 = By.xpath('//select[@name = "taxExemptPrefCurrency"]/option[@selected="selected"]');
    driver.findElements( currencyLocator_2 ).then( function ( elements ) {

        if( elements.length > 0) {
            driver.findElement( currencyLocator_2 ).getText().then( function (x) {
                cusInfoObj.homeCurrency = x;
                log.debug(' Home Currency is: ' + x);
            });
        }
    });
}

function extractDCInfo_AssignDataCenter() {

    var url = QRS_Server + '/ucs/internal/selectCustomerProfile.do?CUSTID=' + cusInfoObj.tenantID + '&vpc_global_token=' + vpcToken;
    driver.get( url );
    driver.findElement(By.xpath("//input[@value = 'Assign Customer DataCenters']")).click();

    driver.findElements(By.xpath("//select[@name = 'assDataCenters']/option")).then(function( options ){
        for (var k =0; k< options.length; k++)
        {
            options[k].getAttribute('value').then( function( str ){
                cusInfoObj.dataCenter.push( str );
                log.debug(" Data centers is/are: " + cusInfoObj.dataCenter);
                getDCLocation( str );
            });
        }
    });
 }


function getDCLocation( dataCenter ){

    var dataInfo = DC_LIST_JSON[dataCenter];
    if(dataInfo === undefined){
        throw new Error("Can't Find DC in current DATA_CENTER-JSON!!! Add it in config.json file...");
    }

    cusInfoObj.customerDCLocations[dataCenter] = dataInfo;
    log.debug(" DC Location is/are: ");
    log.debug( cusInfoObj.customerDCLocations );
}


function extractCustomerLocation_ESM() {

    var url = QRS_Server + '/ucs/internal/integrationService.do?action=init&customerId='+ cusInfoObj.tenantID + '&vpc_global_token=' + vpcToken;
    driver.get(url).then( function () {
        log.debug(" Go to QRS ESM with url: " + url);
    });

    driver.findElements(By.xpath("//a[text() = 'SM']")).then( function( elements ) {
        if (elements.length < 1) { //SM tab does not exist
            cusInfoObj.locationName = "None";
        } else {

            //click on SM tab, if it appears it depends on configuration
            elements[0].click();

            //SM not configured, alert appear, confirm it
            driver.wait(until.alertIsPresent(), 5000).then(
                    function runAlert() { //in case of alert for the missing configuration of SM

                        driver.switchTo().alert().accept();
                    }, function notAppear() {
                        log.trace(' SM is not configured, but alert does not appear');
                    });

            //if SM is configured, get attributes
            var customerLocLocator = By.xpath("//input[@value = 'Customer Locations']");
            driver.findElements( customerLocLocator ).then( function ( elements ) {
                if(elements.lenght > 0) {
                    driver.findElement(By.xpath("//input[@value = 'Customer Locations']")).click();
                    driver.findElement(By.xpath("//tr[@class = 'table_row2']/td")).getText().then( function(x) {
                        cusInfoObj.locationName = x;
                        log.debug(' Customer location name is: ' + cusInfoObj.locationName);
                    });
                    driver.findElement(By.xpath("//tr[@class = 'table_row2']/td")).getAttribute('title').then( function(x) {
                        if (x.length > 0) {
                            cusInfoObj.locationName = x;
                            log.debug(' Customer location full name is: ' + cusInfoObj.locationName);
                        }
                    });
                } else {
                    cusInfoObj.locationName = "None";
                    log.debug(' Customer location name is: ' + cusInfoObj.locationName);
                }
            });
        }
    });
}


function extractContactEmail_ContactManagement() {
    var url = QRS_Server + '/ecs/internal/contactManagement.do?vpc_global_token=' + vpcToken;
    driver.get(url);
    driver.findElement(By.xpath("//select[@name = 'customerId']/option[text() = '" + cusInfoObj.customerName + "']")).click();

    getContactEmailByRecursion();
}

function getContactEmailByRecursion() {

    //get contact email in current page
    driver.findElements(By.xpath("//table[@id = 'parent']/tbody[1]/tr/td[text() = 'Contact']")).then(
            function ( elements ){
                if(elements.length > 0) {
                    driver.findElement(By.xpath("//td[text() = 'Contact']/parent::tr/td[4]")).getText().then( function(x) {
                        cusInfoObj.contactEmail = x;
                        log.debug(' Ticket Required Email is: ' + cusInfoObj.contactEmail);
                    });
                }
            });

    //not in current page, not next page exist, ==>exit
    driver.findElements(By.xpath("//a[text() = 'Next']")).then(
            function( elements ){
                if(elements.length < 1) { // not next page
                    if(cusInfoObj.contactEmail === undefined) { //not find in current page
                        cusInfoObj.contactEmail = "None";
                        console.log(' -> Sorry, cannot find Contact Email in QRS.');
                        console.log(' -> The Contact Email is set: ' + cusInfoObj.contactEmail );
                    }
                }
            });

    //go to next page recursively
    driver.findElements(By.xpath("//a[text() = 'Next']")).then(
            function( elements ) {
                if(elements.length > 0) {
                    driver.findElement(By.xpath("//a[text() = 'Next']")).click().then( function() {
                        if(cusInfoObj.contactEmail === undefined) { //not find in current page
                            getContactEmailByRecursion();
                        }
                    });
                }
            });
}

function getContactEmailAddress() {
    driver.findElements(By.xpath("//table[@id = 'parent']/tbody[1]/tr/td[text() = 'Contact']")).then( function( elements ) {
        if(elements.length > 0) {
            log.trace('I am at getContactEmailAddress func');
            findContact();
        } else {
            log.trace('I am at getContactEmailAddress func....');
            failFindContact();
        }
    } );
}

function findContact() {
    driver.findElement(By.xpath("//td[text() = 'Contact']/parent::tr/td[4]")).getText().then( function(x) {
        cusInfoObj.contactEmail = x;
        log.debug(' Ticket Required Email is : ' + cusInfoObj.contactEmail);
    });
}

function failFindContact() {
    driver.findElements(By.xpath("//a[text() = 'Next']")).then( function( elements ) {
        if(elements.length > 0) {
            driver.findElement(By.xpath("//a[text() = 'Next']")).click().then(
                getContactEmailAddress()
            );
        } else {
            cusInfoObj.contactEmail = "None";
            console.log('==> Sorry, cannot find Contact Email in QRS. ==>');
            console.log('==> The Contact Email is set: ' + cusInfoObj.contactEmail + ' ==>');
        }
    });
}

function extractCompanyCode_ESM() {
    var url = QRS_Server + '/ucs/internal/integrationService.do?action=init&customerId='+ cusInfoObj.tenantID+ '&vpc_global_token=' + vpcToken;
    driver.get(url).then( function( ) {
        getCompanyCode();
        getManagementRegion();
    });
}

function getCompanyCode() {
    driver.findElement(By.xpath("//input[@name = 'mdmCustomerCode']")).getAttribute('value').then( function(x) {

        cusInfoObj.companyCode = x;
        if( x.length <1){
            cusInfoObj.companyCode = "None";
        }
        log.debug(' Company Code is : ' + cusInfoObj.companyCode);
    });
}

function getManagementRegion() {

    driver.findElements(By.xpath("//select[@name = 'mgmtRegion']/option[@selected = 'selected']")).then( function ( elements ) {
        if( elements.length > 0 ) {

            elements[0].getText().then( function( str ) {
                cusInfoObj.managementRegion = str;
                log.debug(' Management Region is: ' + str);
            });
        } else {
            cusInfoObj.managementRegion = "None";
            log.debug(' Management Region is: ' + cusInfoObj.managementRegion);
        }
    });
}


module.exports = {
    run : run
};
