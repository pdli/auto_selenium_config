/**
 * Created by pengl on 2/20/2017.
 * Description: This script is used to assign service account to customer in QRS.
 * Parameters : serviceAccount, customerName
 * Return     : None
 */

const WebDriverFactory = require('../util/src/WebdriverFactory');
const PropelCommands = require('../util/src/PropelCommands');
const config = require('../config/config.json');
const By = require('selenium-webdriver').By;
const until = require('selenium-webdriver').until;
const io = require('selenium-webdriver/io');
const path = require('path');

const USER_ROLES_LIST = config.qrsUserRoles;
const QRS_Server = config.qrsServer;
const TIMEOUT = 50000;

//global variables
var log;
var driver;
var promise;
var vpcToken = '';

//QRS account, replaced by ClassB cert
var g_QRSAccount, g_QRSPwd;

//customer info
var g_serviceAccount = ''; //email format is must
var g_customerName = '';


/**************************************************************
 ************************* Processes **************************
 **************************************************************/

function run( options ) {

    return new Promise(function(resovle, reject){

        setUp( options );

        log.info("***** Step - 3: Assign Service Account in QRS ******");

        promise = logInQRS();

        promise
                .then( getVpcToken )
                .then( goAndAddCustomerUser )
                .then( goAndEditCustomerRole )
                .then( checkResult )
                .then( teatDown )
                .then( function() {
                    resovle();
                })
                .catch( function(err) {

                    PropelCommands.takeScreenShot(driver, 'assign_ServiceAccount_snapshot');
                    console.log("" + err);
                    teatDown();
                    reject();
                })
    });
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

function setUp( options ) {

    //set trace level: info by default.
    const log4js = require('log4js');
    log4js.configure("./config/log4js.json");
    log = log4js.getLogger( options.debug);


    g_customerName = options.customerName;
    g_serviceAccount = options.serviceAccount;

    driver = new WebDriverFactory('phantomJsC').driver;
}

function teatDown(){

    driver.quit();
    promise.cancel();
}

function loginWithAccount(){

    //login with username & password
    driver.findElement(By.name('USER')).sendKeys( g_QRSAccount );
    driver.findElement(By.name('PASSWORD')).sendKeys( g_QRSPwd );
    driver.findElement(By.xpath("//input[@value = 'Log on']")).click();
}

function loginWithDigitalBadge() {

    var badgeLocator = By.name('digBadgeAnchor');
    driver.wait(until.elementLocated( badgeLocator ), TIMEOUT);
    driver.wait(until.elementIsEnabled(driver.findElement( badgeLocator)), TIMEOUT);
    driver.findElement( badgeLocator ).click();
}

function logInQRS() {

    driver.get( QRS_Server + '/ucs/internal/home.do' );
    driver.wait(until.titleContains("HP SiteMinder Login"), TIMEOUT);

    loginWithDigitalBadge();

    return driver.wait(until.titleContains('Flexible Computing'), TIMEOUT);
}

function goAndAddCustomerUser(){

    log.debug(' Customer name is: ' + g_customerName);
    log.debug(' Service account is: ' + g_serviceAccount);

    driver.get( QRS_Server + '/ucs/internal/doAdminRole.do?vpc_global_token=' + vpcToken);
    driver.wait(until.elementLocated(By.xpath("//h3[contains(text(), 'Assign Roles To Users')]")), TIMEOUT);

    driver.findElement(By.name('Add0')).click();

    var locator = By.xpath("//select[@id = 'CustomerList' and @name = 'CustomerList']/option[text() = '" + g_customerName + "']");
    driver.wait(until.elementLocated( locator ), TIMEOUT);
    driver.wait(until.elementIsVisible(driver.findElement( locator )), TIMEOUT);
    driver.findElement( locator ).click();

    driver.findElement(By.name('emailAddress')).sendKeys( g_serviceAccount );
    driver.findElement(By.xpath("//input[@name = 'Add' and @value = 'Save' and @type = 'submit']")).click();
}

function checkResult() {

    //goTo Manage User page
    driver.get( QRS_Server + '/ucs/internal/doAdminRole.do?vpc_global_token=' + vpcToken);
    driver.wait(until.elementLocated(By.xpath("//h3[contains(text(), 'Assign Roles To Users')]")), TIMEOUT);

    //goTo edit role page
    driver.findElement(By.xpath("//td[@class = 'table_row1' and text() = '" + g_serviceAccount + "']/following-sibling::td/a[contains(text(), 'Edit Role')]")).click();

    driver.findElement(By.id('email')).getText().then(
            function( str ){
                if(str.length <1){
                    throw new Error('==> Assign roles in QRS is failed -- email not found. Please check manually.');
                }
            });

    //for quick search and delete
    var rolesObj = {};
    for(var i=0; i<USER_ROLES_LIST.length; i++){
        var role = USER_ROLES_LIST[i];
        rolesObj[role] = '';
    }
    driver.findElements(By.xpath("//select[@id = 'selectedList1']/option"))
            .then(
                function (eleList) {
                    for(var i=0; i<eleList.length; i++){
                        eleList[i].getText().then( function (x) {
                            delete rolesObj[x];
                        })
                    }
                })
            .then( function() {
                if(Object.keys(rolesObj).length > 0) {
                    throw new Error('==> Assign roles in QRS is failed -- roles missing. Please check manually.');
                } else {
                    log.info('==> Assign service account successfully in QRS system <==');
                }
            });
}

function goAndEditCustomerRole() {

    driver.get( QRS_Server + '/ucs/internal/doAdminRole.do?vpc_global_token=' + vpcToken);
    driver.wait(until.elementLocated(By.xpath("//h3[contains(text(), 'Assign Roles To Users')]")), TIMEOUT);

    driver.findElement(By.xpath("//td[@class = 'table_row1' and text() = '" + g_serviceAccount + "']/following-sibling::td/a[contains(text(), 'Edit Role')]")).click();

    for (var k=0; k<USER_ROLES_LIST.length; k++) {
        driver.findElement(By.xpath("//select[@id = 'availableList1' and @name = 'availableList']/option[text() = '" + USER_ROLES_LIST[k] + "']")).click().then(
                function opt_callback() {
                    //no output
                }, function opt_errback(){
                    //Already added, should be ignored
                });
        driver.findElement(By.id('createQuote13')).click();
    }

    driver.findElement(By.id('createQuote11')).click();
}

module.exports = {
    run : run
}