/**
 * Created by pengl on 2/23/2017.
 * Author:      pli@hpe.com
 * Description: Log in propel with tenantID = Provider. Create URL and configure 9200 IDM service.
 * Parameters : None
 * Return     : None
**/

// Import libs
const WebDriverFactory = require('../util/src/WebdriverFactory');
const PropelCommands = require('../util/src/PropelCommands');
const WebDriverCommands = require('../util/src/WebdriverCommands.js');
const config = require('../config/config.json');
const By = require('selenium-webdriver').By;
const until = require('selenium-webdriver').until;
const io = require('selenium-webdriver/io');
const path = require('path');

//Propel configuration
const PROPEL_SERVER = config.propelServer;
const TIMEOUT = config.propelElementTimeout;
const TIMEOUT_ORGCHECK = config.propelValidLoadingTime;

var log;
var propelOrgConfigJson;
var builder;
var driver;
var webPromise;

console.time("createPropelURL");
/***********************************************************
 * Main Process
 * 1) Login Propel with Admin Account
 * 2) Upload file of propelUploadJSON_
 * 3) Activate
 ***********************************************************/
function run( options ) {

    return new Promise(function (resovle, reject) {

        setUp(options);

        log.info("****** Step - 5: Create Org URL in ProPel: " + propelOrgConfigJson.displayName +" ****** ");

        webPromise = PropelCommands.logInPropel(driver, PROPEL_SERVER, "provider", config.propelProviderAccount, config.propelProviderPassword);

        webPromise
            .then( createNewOrganization )
            .then( addUsers )
            .then( addRoles )
            .then( addGroups )
            .then( manageBilling )
            .then( manageIRIM )
            .then( manageCompartments )
            .then( tearDown )
            .then(function () {

                log.info("===> New Org URL create successfully, please move on: " + propelOrgConfigJson.urlName + " <===");
                resovle();
            })
            .catch(function (err) { //check result

                PropelCommands.takeScreenShot( driver, "createURL_snapshot_" + propelOrgConfigJson.urlName );
                log.error(err);
                log.info("===> Oops, New Org URL create fail, please check it manually or re-run it: " + propelOrgConfigJson.urlName + " <===");
                tearDown();
                reject();
            });
    });
}

function setUp(options) {

    //set trace level: info by default.
    const log4js = require('log4js');
    log4js.configure("./config/log4js.json");
    log = log4js.getLogger( options.debug);


    propelOrgConfigJson = options.data;

    var factory = new WebDriverFactory(config.browser);
    driver = factory.driver;
    builder = factory.builder;
}

function createNewOrganization() {

    log.debug(' => Start to create Portal URL for Org: ' + propelOrgConfigJson.displayName );

    var url = PROPEL_SERVER + ":9200/home";
    PropelCommands.getPropelUrl( driver,  url );
    driver.wait(until.titleContains('Identity'), TIMEOUT);

    var searchLocator = By.id('search');
    WebDriverCommands.sendKeysToInputElement( driver, searchLocator, propelOrgConfigJson.displayName, TIMEOUT);

    var orgLocator = By.id( propelOrgConfigJson.displayName );
    driver.wait(until.elementLocated( orgLocator ), TIMEOUT_ORGCHECK).then( function() {

        // return rejected Promise
        //throw (" => Propel URL already existed. Will not create it again. <= ");
        log.debug( "  --> Propel URL already existed. Will not create it again.");

    }, function () {

        var createLocator = By.xpath('//a[contains(text(), "Create Organization")]');
        WebDriverCommands.clickButton(driver, createLocator, TIMEOUT);

        var displayNameLocator = By.id('displayName');
        WebDriverCommands.sendKeysToInputElement(driver, displayNameLocator, propelOrgConfigJson.displayName, TIMEOUT);

        var createBtnLocator = By.xpath('//button[contains(text(), "Create")]');
        WebDriverCommands.clickButton(driver, createBtnLocator, TIMEOUT);
    });
}

function addUsers() {

    log.debug(" => Start to add users");

    var url = PROPEL_SERVER + ':9200/organization/' + propelOrgConfigJson.urlName + '/internalUsers';
    PropelCommands.getPropelUrl( driver,  url );

    //get list of admin users
    var adminUsersList = propelOrgConfigJson.adminUsers.slice();

    for (var i = 0; i < adminUsersList.length; i++) {

        ( function( userName, passWord){

            var existingUserLocator = By.xpath('//small[text() = "' + userName + '"]');
            driver.findElements( existingUserLocator ).then( function( elements ) {

                if( elements.length > 0 ) {

                    log.debug('  --> User already existed, it will not be created: ' + userName );
                }
                else {

                    log.debug("  --> Add user: " + userName);

                    //"CREATE USERS" button
                    var createBtnLocator = By.xpath('//a[contains(text(), "Create User")]');
                    WebDriverCommands.clickButton(driver, createBtnLocator, TIMEOUT);

                    //Account User Name
                    var accountLocator = By.id('accountUsername');
                    WebDriverCommands.sendKeysToInputElement(driver, accountLocator, userName, TIMEOUT);

                    //disable auto generate password
                    var disAutoBtnLocator = By.xpath('//div[@class="column medium-12 small-12"]/div[@class="checkbox"]'
                        +'/input[@type = "checkbox" and @ng-change="autoGenerateChanged()"]');
                    WebDriverCommands.clickInput( driver, disAutoBtnLocator, TIMEOUT);

                    var pwdLocator = By.id("accountPassword");
                    WebDriverCommands.sendKeysToInputElement(driver, pwdLocator, passWord, TIMEOUT);

                    var repeatPwdLocator = By.id("accountRepeat");
                    WebDriverCommands.sendKeysToInputElement(driver, repeatPwdLocator, passWord, TIMEOUT);

                    var clickBtnLocator = By.xpath('//button[text()  = "Create"]');
                    WebDriverCommands.clickButton(driver, clickBtnLocator, TIMEOUT);

                    //wait for completion
                    PropelCommands.waitPageLoading( driver, TIMEOUT );

                    //result check
                    var userNameLocator = By.xpath('//small[@class="text-secondary ng-binding" and text()="' + userName + '"]');
                    WebDriverCommands.waitElementAvailable(driver, userNameLocator, TIMEOUT );
            }});
        })( adminUsersList[i].username, adminUsersList[i].password );
    }
}


function addRoles() {

    log.debug(' => Start to create new roles');

    var url = PROPEL_SERVER + ':9200/organization/' + propelOrgConfigJson.urlName + '/role';
    PropelCommands.getPropelUrl( driver, url);

    for( var i=0; i< config.roleList.length; i++ ){

        //closure function is needed
        (function( roleName ){

            addNewRole( roleName );

        })( config.roleList[i] );
    }
}

function addNewRole( roleName ) {

    var roleLocator = By.xpath('//small[text() = "'+ roleName +'"]');
    driver.findElements( roleLocator ).then( function ( elements ) {
        if( elements.length >0 ){

            log.debug("  --> Role already existed, it will not be created: " + roleName );
        } else {

            log.debug("  --> Create Role: " + roleName);

            var createLocator = By.linkText('CREATE ROLE');
            WebDriverCommands.clickButton(driver, createLocator, TIMEOUT);

            PropelCommands.waitPageLoading( driver, TIMEOUT );

            var roleNameLocator = By.id('displayName');
            WebDriverCommands.sendKeysToInputElement(driver, roleNameLocator, roleName, TIMEOUT);

            var selectTemLocator = By.xpath('//select[@ng-model = "vm.selectedRoleTemplate"]/option[text()="'+ roleName +'"]');
            WebDriverCommands.clickButton(driver, selectTemLocator, TIMEOUT);

            var createBtnLocator = By.xpath('//button[text() = "Create"]');
            WebDriverCommands.clickButton(driver, createBtnLocator, TIMEOUT);

            var shadowLocator = By.className('reveal-modal-bg fade in');
            WebDriverCommands.waitElementStaleness( driver, shadowLocator, TIMEOUT );

            //wait for completion
            PropelCommands.waitPageLoading( driver , TIMEOUT );

            //result check
            var newCreatedRoleLocator = By.xpath('//small[text()="' + roleName +'"]');
            WebDriverCommands.waitElementLocated( driver, newCreatedRoleLocator, TIMEOUT);

            //go to role page again
            var url = PROPEL_SERVER + ':9200/organization/' + propelOrgConfigJson.urlName + '/role';
            PropelCommands.getPropelUrl( driver, url);
        }
    });
}

function addGroups() {

    log.debug(' => Start to add new groups');

    for( var i=0; i<config.groupList.length; i++){

        ( function( groupName) {

            var url = PROPEL_SERVER + ":9200/organization/" + propelOrgConfigJson.urlName + "/group";
            PropelCommands.getPropelUrl( driver,  url );

            createNewGroup( groupName );

            goToEditDedicatedGroupPage( groupName );

            addAssociatedUserToGroup( propelOrgConfigJson.groupUserMap[ groupName ] );

            addAssociatedRoleToGroup( config.groupRoleMappingList[ groupName ]);

            saveAndExistGroupEditPage();

        })( config.groupList[i] );
    }
}

function createNewGroup( groupName ) {

    PropelCommands.waitPageLoading( driver, TIMEOUT );

    var newGroupLocator = By.xpath('//small[ text() = "' + groupName+ '"]');
    driver.findElements( newGroupLocator ).then( function( elements ) {

        if( elements.length > 0) {

            log.debug( "  ==> Group " + groupName + " already existed, it will not be created.");
        }
        else {

            log.debug('  ==> Create Group: ' + groupName);

            var createBtnLocator = By.xpath('//a[contains(text(), "Create Group")]');
            WebDriverCommands.clickButton(driver, createBtnLocator, TIMEOUT);

            PropelCommands.waitPageLoading(driver, TIMEOUT);

            var groupNameLocator = By.id('groupName');
            WebDriverCommands.sendKeysToInputElement(driver, groupNameLocator, groupName, TIMEOUT);

            //Agree with Propel IDM dev team, external groups start with prefix "VPC_"
            if (groupName.startsWith("VPC_")) {

                var groupRepresentationLocator = By.xpath('//select[@name = "repType"]/option[@label = "Token IDM Representation"]');
                WebDriverCommands.clickButton(driver, groupRepresentationLocator, TIMEOUT);
            }

            //remove shadow bfr click CREATE btn
            var propelFooterLocator = By.xpath('//propel-footer[@class = "ng-scope ng-isolate-scope"]');
            WebDriverCommands.removeShadowPanel( driver, propelFooterLocator, TIMEOUT);

            var createBtnLocator = By.id('createBtn');
            WebDriverCommands.clickButton(driver, createBtnLocator, TIMEOUT);

            //wait for completion
            PropelCommands.waitPageLoading(driver, TIMEOUT);

            var newCreatedGroupLocator = By.xpath('//small[ text() = "' + groupName + '"]');
            driver.wait(until.elementLocated(newCreatedGroupLocator), TIMEOUT);
        }
    });
}

function goToEditDedicatedGroupPage ( groupName ){

    var possibleShadowLocator = By.xpath('//h4[@class="pb"]');
    WebDriverCommands.removeShadowPanel(driver, possibleShadowLocator, TIMEOUT);

    var groupEditLocator = By.xpath('//small[text()="' + groupName +'"]/ancestor::div[@class="row list-item ng-scope"]'
        + '//i[@class = "lifecycle-icon-Edit"]');
    WebDriverCommands.clickButton( driver, groupEditLocator, TIMEOUT );

    PropelCommands.waitPageLoading( driver, TIMEOUT );

    //wait for context loading
    var groupNameLocator = By.id('groupName');
    WebDriverCommands.waitElementAvailable( driver, groupNameLocator, TIMEOUT );
}

function addAssociatedUserToGroup( userList ) {

    for ( var i=0; i< userList.length; i++) {

        //closure function is needed
        ( function( userName ){

            var existingUserLocator = By.xpath('//div[@class="column small-11 medium-11 ng-binding" and text() ="'+ userName +'"]');
            driver.findElements( existingUserLocator ).then( function ( elements ) {

                if( elements.length > 0 ){

                    log.debug("  --> User already be associated to Group: " + userName );

                } else {

                    //This part of function should be refactored very carefully.
                    var searchUserLocator = By.id("predictive_user_value");
                    WebDriverCommands.sendKeysToInputElement( driver, searchUserLocator, userName, TIMEOUT);

                    var userLocator = By.xpath('//div[@id="predictive_user_dropdown"]//div[text()="'+ userName +'"]');
                    driver.wait(until.elementLocated( userLocator ), TIMEOUT_ORGCHECK).then(function(){}, function ( ) {

                        WebDriverCommands.resendKeysToInputElement( driver, searchUserLocator, userName, TIMEOUT);
                    });
                    WebDriverCommands.clickButton( driver, userLocator, TIMEOUT);

                    var addBtnLocator = By.xpath('(//a[text() = "Add"])[1]');
                    WebDriverCommands.clickButton( driver, addBtnLocator, TIMEOUT).then( function() {

                        log.debug("  --> Add User to Group: " + userName);
                    });
                }
            });

        })( userList[i]);
    }
}

function addAssociatedRoleToGroup( roleList ) {

    for ( var i=0; i< roleList.length; i++) {

        (function( roleName ){

            var existingRoleLocator = By.xpath('//div[@class="list-group panel-default small-12"]' +
                '//span[@class="list-group-item ng-scope"]' +
                '//div[contains(text(), "'+ roleName+'")]');
            driver.findElements( existingRoleLocator ).then( function ( elements) {

                if( elements.length > 0) {

                    log.debug("  --> Role already be associated to Group: " + roleName );
                } else {

                    log.debug("  --> Add Role to Group: " + roleName);

                    var roleSearchLocator = By.id('roleSearch_value');
                    WebDriverCommands.sendKeysToInputElement( driver, roleSearchLocator, roleName, TIMEOUT);

                    var addBtnLocator = By.xpath('(//input[@id="roleSearch_value"]/ancestor::div[@class="row ng-scope"])[last()]' +
                        '//a[text()="Add"]');
                    WebDriverCommands.clickButton( driver, addBtnLocator, TIMEOUT);
                }
            });
        })( roleList[i]);
    }
}

function saveAndExistGroupEditPage() {

    //Save button
    var saveBtnLocator = By.xpath('//button[text() = "Save"]');
    WebDriverCommands.waitElementEnabled( driver, saveBtnLocator, TIMEOUT_ORGCHECK).then( function () {

        //save and back
        WebDriverCommands.clickButton(driver, saveBtnLocator, TIMEOUT);
    }, function () {

        //Back without save
        var backBtnLocator = By.xpath('//button[text() = "Back"]');
        WebDriverCommands.clickButton(driver, backBtnLocator, TIMEOUT);
    });

    PropelCommands.waitPageLoading( driver, TIMEOUT );

    //wait for completion
    var groupLocator = By.xpath('//h3[contains(text(), "Groups")]');
    WebDriverCommands.waitElementAvailable(driver, groupLocator, TIMEOUT);
}

function manageCompartments() {

    createCompartments();

    assignCompartmentsToGroups();
}

function createCompartments() {

    var url = PROPEL_SERVER + ":9200/organization/" + propelOrgConfigJson.urlName + "/compartment/";
    PropelCommands.getPropelUrl( driver,  url );

    //wait for full page loading
    var compartmentsLocator = By.xpath('//h3[text() = "Compartments"]');
    WebDriverCommands.waitElementAvailable( driver, compartmentsLocator, TIMEOUT).then( function () {

        log.debug(' => Start to create compartments.');
    });

    for (var i = 0; i < propelOrgConfigJson.compartments.length; i++) {

        ( function( compartmentJson ) {

            var url = PROPEL_SERVER + ":9200/organization/" + propelOrgConfigJson.urlName + "/compartment/";
            PropelCommands.getPropelUrl( driver,  url );

            //wait for full page loading
            var compartmentsLocator = By.xpath('//h3[text() = "Compartments"]');
            WebDriverCommands.waitElementAvailable( driver, compartmentsLocator, TIMEOUT);

            var existingComLocator = By.xpath('//small[text()="'+ compartmentJson.name +'"]');
            driver.findElements( existingComLocator ).then( function( elements ){

                if( elements.length > 0 ) {

                    log.debug("  --> Compartment already existed, it will not be created: " + compartmentJson.name);
                } else {

                    log.debug("  --> Create compartment: " + compartmentJson.name);

                    PropelCommands.waitPageLoading( driver, TIMEOUT);

                    var createBtnLocator = By.partialLinkText("CREATE COMPARTMENT");
                    WebDriverCommands.clickButton(driver, createBtnLocator, TIMEOUT);

                    PropelCommands.waitPageLoading( driver, TIMEOUT);

                    //remove shadow after each compartment creation
                    var shadowLocator = By.className('reveal-modal-bg fade in');
                    WebDriverCommands.removeShadowPanel( driver, shadowLocator, TIMEOUT);

                    //Input compartment name
                    var nameLocator = By.id('compName');
                    WebDriverCommands.sendKeysToInputElement(driver, nameLocator, compartmentJson.name, TIMEOUT);

                    //Input 'TENANT ID'
                    var tenantIdLocator = By.id('tenantId');
                    WebDriverCommands.sendKeysToInputElement(driver, tenantIdLocator, compartmentJson.tenantId, TIMEOUT);

                    var dcSelectLocator = By.xpath('//select[@ng-model="compartment.dataCenter.dcCode"]');
                    WebDriverCommands.clickButton(driver, dcSelectLocator, TIMEOUT);

                    var dcOptionsLocator = By.xpath('//select/option[text() = "' + compartmentJson.dataCenter.dcCode + '"]');
                    WebDriverCommands.clickButton(driver, dcOptionsLocator, TIMEOUT);

                    var accountLocator = By.id('serviceAccountName');
                    WebDriverCommands.sendKeysToInputElement(driver, accountLocator, compartmentJson.serviceAccount.name, TIMEOUT);

                    var pwdLocator = By.id('password');
                    WebDriverCommands.sendKeysToInputElement(driver, pwdLocator, compartmentJson.serviceAccount.password, TIMEOUT);

                    //isSecondary, default UI is false
                    if (compartmentJson.isSecondary) {

                        var secondDcLocator = By.id("secondaryDc");
                        driver.findElement(secondDcLocator).click();
                    }

                    //Create button
                    var createBtnLocator = By.css("div.modal-footer > button.small.ng-binding");
                    driver.findElement(createBtnLocator).click();

                    //wait for page loading
                    PropelCommands.waitPageLoading(driver, TIMEOUT);

                    //wait for completion, double check
                    // - If more compartments created, it will not appear till scrolling the page.
                    // - So, I can't check the result.
                    //var createdCompLocator = By.xpath('//small[text()="'+ compartmentJson.name +'"]');
                    //WebDriverCommands.waitElementAvailable( driver, createdCompLocator, TIMEOUT);
                }});
        })( propelOrgConfigJson.compartments[i] );
    }
}

function deleteExistingCompartmentAssignment() {

    var editLocator = By.css("i.lifecycle-icon-Edit");
    WebDriverCommands.clickButton(driver, editLocator, TIMEOUT);

    var trashLocator = By.className("lifecycle-icon-Trash");
    driver.findElements(trashLocator).then(function (elements) {

        for (var i = 0; i < elements.length; i++) {

            elements[i].click();
        }

        if( elements.length > 0) {

            var saveLocator = By.xpath('//button[text()="Save"]');
            WebDriverCommands.clickButton(driver, saveLocator, TIMEOUT);
        } else {

            var cancelLocator = By.xpath('//button[text()="Cancel"]');
            WebDriverCommands.clickButton(driver, cancelLocator, TIMEOUT);
        }
    });
}

function addNewCompartmentAssignment() {

    //Add new assignment
    var editLocator = By.css("i.lifecycle-icon-Edit");
    WebDriverCommands.clickButton(driver, editLocator, TIMEOUT);

    var addLocator = By.css("i.lifecycle-icon-Attach");
    WebDriverCommands.clickButton(driver, addLocator, TIMEOUT);

    for (var k=0; k< propelOrgConfigJson.compartments.length; k++ ){

        var compartmentName = propelOrgConfigJson.compartments[k].name;

        var compartmentListLocator = By.xpath('//span[contains(text(),"' + compartmentName +'")]/preceding-sibling::div/input[@type="checkbox"]');
        WebDriverCommands.clickButton(driver, compartmentListLocator, TIMEOUT);

        //wait for completion
        var compartmentLocator = By.xpath('//span[@class="category-label ng-binding" and contains(text(),"' + compartmentName + '")]');
        WebDriverCommands.waitElementAvailable(driver, compartmentLocator, TIMEOUT);
    }

    var okLocator = By.id('ok');
    WebDriverCommands.clickButton(driver, okLocator, TIMEOUT);

    var shadowLocator = By.className('reveal-modal-bg fade in');
    WebDriverCommands.waitElementStaleness( driver, shadowLocator, TIMEOUT);

    var saveLocator = By.xpath('//button[text()="Save"]');
    WebDriverCommands.clickButton(driver, saveLocator, TIMEOUT);
}

function assignCompartmentsToGroups() {

    var url = PROPEL_SERVER + ":9200/organization/" + propelOrgConfigJson.urlName + "/comprole/";
    PropelCommands.getPropelUrl( driver,  url );

    for (var i = 0; i < propelOrgConfigJson.cRoles.length; i++) {

        ( function( groupName ) {

            var groupLocator = By.xpath('//small[contains(text(),"' + groupName + '")]/preceding-sibling::a/i[@class="fa fa-chevron-right"]');
            WebDriverCommands.clickButton(driver, groupLocator, TIMEOUT).then( function () {

                log.debug("  ==> Assign compartments to group: " + groupName );
            });

            PropelCommands.waitPageLoading( driver, TIMEOUT );

            deleteExistingCompartmentAssignment();

            addNewCompartmentAssignment();

            //To back, css=i.fa.fa-chevron-down
            var backLocator = By.css("i.fa.fa-chevron-down");
            WebDriverCommands.clickButton(driver, backLocator, TIMEOUT);

        })(propelOrgConfigJson.cRoles[i].name);
    }
}

//We can use a function to handle these two below..
function manageBilling() {

    log.debug( " => Start to update JBilling.");

    var url = PROPEL_SERVER + ":9200/organization/" + propelOrgConfigJson.urlName + "/jbilling";
    PropelCommands.getPropelUrl( driver,  url );

    var BillingCfgJson = propelOrgConfigJson.jbilling;

    var editLocator = By.partialLinkText("EDIT JBILLING");
    WebDriverCommands.clickButton(driver, editLocator, TIMEOUT);

    var customerIdLocator = By.id('customerid');
    WebDriverCommands.sendKeysToInputElement( driver, customerIdLocator, BillingCfgJson.customerId, TIMEOUT );

    var accountLocator = By.id('loginaccount');
    WebDriverCommands.sendKeysToInputElement( driver, accountLocator, BillingCfgJson.loginName, TIMEOUT );

    var pwdLocator = By.id('password');
    WebDriverCommands.sendKeysToInputElement( driver, pwdLocator, BillingCfgJson.password, TIMEOUT );

    var currencyLocator = By.id('currencycode');
    WebDriverCommands.sendKeysToInputElement( driver, currencyLocator, BillingCfgJson.currencyCode, TIMEOUT );

    //Save Billing Configuration
    var saveLocator = By.css("div.modal-footer > button.small.ng-binding");
    WebDriverCommands.clickButton(driver, saveLocator, TIMEOUT);
}

function manageIRIM() {

    log.debug(' => Start to update IRIM.');

    var url = PROPEL_SERVER + ":9200/organization/" + propelOrgConfigJson.urlName + "/irim";
    PropelCommands.getPropelUrl( driver,  url );

    var IrimCfgJson = propelOrgConfigJson.irim;

    var editLocator = By.xpath('//a[contains(text(), "Edit IRIM")]');
    WebDriverCommands.clickButton(driver, editLocator, TIMEOUT);

    var customerLocator = By.id('customerid');
    WebDriverCommands.sendKeysToInputElement( driver, customerLocator, IrimCfgJson.customerId, TIMEOUT);

    var accountLocator = By.id('loginaccount');
    WebDriverCommands.sendKeysToInputElement( driver, accountLocator, IrimCfgJson.loginName, TIMEOUT);

    var pwdLocator = By.id('password');
    WebDriverCommands.sendKeysToInputElement( driver, pwdLocator, IrimCfgJson.password, TIMEOUT);

    var saveLocator = By.css("div.modal-footer > button.small.ng-binding");
    WebDriverCommands.clickButton(driver, saveLocator, TIMEOUT);
}

function tearDown() {

    driver.quit();
    webPromise.cancel();
    console.timeEnd("createPropelURL");
}

module.exports = {

    run: run
}
