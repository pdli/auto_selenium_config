/**
 * Created by pengl on 2/20/2017.
 * Description: The script is used to add service account in Directory Works
 * Parameters : serviceAccount, password(default)
 * Return     : None
 */

const WebDriverFactory = require('../util/src/WebdriverFactory');
const PropelCommands = require('../util/src/PropelCommands');
const config = require('../config/config.json');
const By = require('selenium-webdriver').By;
const until = require('selenium-webdriver').until;
const path = require('path');

//customer info variable
const TIMEOUT = 30000;
const DW_Server = config.directoryWorksServer;
var log;
var driver;
var promise;
var serviceAccount = '';
var servicePwd = '';

/*************************************************
******************* Processes ********************
*************************************************/

function run( options ) {
    return new Promise(function(resovle, reject){

        setUp( options );

        log.info("***** Step - 2: Create Service Account in Directory Works ******");

        //Create Service Account in DirectoryWorks
        promise = logInDirectoryWorks();

        promise
                .then( createAccount )
                .then( function(){
                    checkResult( 0 );
                } )
                .then( tearDown )
                .then(function(){
                    resovle();
                })
                .catch( function(err) {

                    PropelCommands.takeScreenShot(driver, 'run_DirectoryWorks_snapshot');
                    console.log(err);
                    tearDown();
                    reject();
                });
    });

}

function setUp( options ) {

    //Set trace level: info by default.
    const log4js = require('log4js');
    log4js.configure("./config/log4js.json");
    log = log4js.getLogger( options.debug);


    serviceAccount = options.serviceAccount;
    servicePwd = options.servicePwd;

    log.debug(' New added Service Account is: ' + serviceAccount);
    log.debug(' Password of Service Account is: ' + servicePwd);

    driver = new WebDriverFactory('phantomJsC').driver;
}

function  loginWithUsername( loginAccount, loginPwd) {

    var userLocator = By.id('username');
    driver.wait(until.elementLocated( userLocator), TIMEOUT);
    driver.wait(until.elementIsEnabled( driver.findElement( userLocator)), TIMEOUT);
    driver.findElement(userLocator).sendKeys( loginAccount );

    var pwdLocator = By.id('password');
    driver.wait(until.elementLocated( pwdLocator), TIMEOUT);
    driver.wait(until.elementIsEnabled( driver.findElement( pwdLocator)), TIMEOUT);
    driver.findElement(pwdLocator).sendKeys( loginPwd );

    var submitLocator = By.xpath("//input[@type = 'submit' and contains(@value, 'Log on')]");
    driver.wait(until.elementLocated( submitLocator), TIMEOUT);
    driver.wait(until.elementIsVisible( driver.findElement( submitLocator)), TIMEOUT);
    driver.findElement(submitLocator).click();
}

function logInDirectoryWorks() {

    //Log on Directory Works
    driver.get( DW_Server );

    return driver.wait(until.titleContains('DirectoryWorks'), TIMEOUT);
}

function tearDown(){

    driver.quit();
    promise.cancel();
}

function createAccount(){

    var createLocator = By.xpath("//a[text() = 'Create Account']");
    driver.wait(until.elementLocated( createLocator ), TIMEOUT);
    driver.wait(until.elementIsVisible( driver.findElement( createLocator )), TIMEOUT);
    driver.findElement( createLocator ).click();

    driver.findElement(By.name('cn')).sendKeys( serviceAccount );
    driver.findElement(By.name('password')).sendKeys( servicePwd );
    driver.findElement(By.name('confirm_password')).sendKeys( servicePwd );
    driver.findElement(By.xpath("//input[@value = 'programmatic' and @class = 'checkbox']")).click();
    driver.findElement(By.name('ack_policy')).click();
    driver.findElement(By.name('submit')).click();
}

function checkResult( pageNum ){

    const myAccountsUrl = 'https://directoryworks.hpecorp.net/protected/people/view/accounts/?pc_start=';
    var url = myAccountsUrl + pageNum.toString();
    driver.get( url );

    driver.findElements((By.xpath("//a[contains(@title, '"+ serviceAccount +"')]"))).then( function(eleList){
        if(eleList.length>0){

            log.info('==> Create service account is successful in Directory Works System <==');
            return true;
        } else {

            return false;
        }
    }).then( function( isFound ){
        //Service account Not found, go to next page
        if( false === isFound) {

            var accountLocator = By.xpath('//td[@class = "resultsColHdr"]');
            driver.findElements( accountLocator ).then( function ( elements ) {

                //Bug: What happens if the num = 30 * N
                if( elements.length < 30) {

                    throw new Error('==> Create service account is failed in Directory Works System. Check it manually <==');
                } else {

                    pageNum = pageNum + 30;
                    log.debug(" --> Go to next page to search new created Service Account: " + pageNum);
                    checkResult( pageNum );
                }
            });
        }

    });
}

module.exports = {
    run : run
}

