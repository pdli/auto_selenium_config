#!/usr/bin/env node

const pkg = require('./package.json');
const extract = require('./src/step_1_extract_info_In_QRS');
const collaborate = require('./src/step_4_generate_JSON_files');
const add = require('./src/step_2_create_account_In_WorkDirectorys');
const assign = require('./src/step_3_assign_account_In_QRS');
const create = require('./src/step_5_create_url_In_Propel');
const configCatalog = require('./src/step_7_config_one_customer_In_Propel');
const clearConfig = require('./src/step_6_delete_config_categories_In_Propel');
const removeIdentity = require('./src/step_8_remvoe_config_identity_In_Propel');
const PropelFileManagementAPI = require('./src/api/PropelFileManagement');
const TenantManagementAPI = require('./src/api/TenantManagement');
const commander = require('commander');
const fs = require('fs');
const path = require('path');

function generateFullDirName( filename) {

    if(filename === undefined) return '';

    if(path.dirname(filename) === '.'){
        filename= (process.cwd() + '\\' + filename);
    }
    return filename;
}

function checkFile( filename ){

    var regexp = /\.json/i;

    filename = generateFullDirName(filename);

    fs.stat(filename, function(err, stats) {
        if(err) {
            throw new Error("File doesn't exist here: " + filename);
        };
    } );

    if( ! regexp.test(filename)) {
        throw new Error("File format is error... It should be <*.json>");
    }

    return filename;
}

commander
        .version(pkg.version)
        .usage('[command] [options]');

commander
        .command('extract')
        .description('distill Customer Info from QRS system')
        .option('-t, --tenantID <tenant ID>', 'tenant ID of customer')
        .option('-x, --username <QRS username>', 'account to login QRS system')
        .option('-P, --password <QRS password>', 'password to login QRS system')
        .option('-D, --debug [trace|debug|info|warn|error]', 'enable debug mode', /trace|debug|info|warn|error/i, 'info')
        .action( function(options) {
            if( options.tenantID === undefined || options === undefined ) {
                console.warn('Oops, forget to add options...');
            } else {
                console.log("Trace Level is: " + options.debug);
                //extract.run( options.tenant, options.username, options.password, options.debug );
                extract.run( options );
            }
        });

commander
        .command('collaborate')
        .description('process data from QRS system, and save in local separate files')
        .option('-J, --billingID <jBilling Customer ID>', 'jBilling customer ID is required.', /\d*/)
        .option('-t, --tenantID <tenant ID>', 'tenant ID of customer')
        .option('-f, --jsonFile <file name>', 'process data from external file')
        .option('-D, --debug [trace|debug|info|warn|error]', 'enable debug mode', /trace|debug|info|warn|error/i, 'info')
        .action( function(options) {
            if( options.tenantID === undefined || options.billingID === undefined || options === undefined ) {

                console.warn('Oops, forget to add options...');
            } else {

                options.jsonFile = generateFullDirName( options.jsonFile);
                collaborate.run( options );
            }
        });

commander
        .command('add')
        .description('add service account in Directory Works System')
        .option('-x, --username <directoryWorks account>', 'account to login DirectoryWorks System')
        .option('-P, --password <directoryWorks password>', 'password to login DirectoryWorks System')
        .option('-c, --serviceAccount <service account>', 'new customer account in Work Directory System')
        .option('-n, --servicePwd <service password>', 'servicePwd for new created customer in Work Directory System')
        .option('-D, --debug [trace|debug|info|warn|error]', 'enable debug mode', /trace|debug|info|warn|error/i, 'info')
        .action( function(options) {
            if( options.serviceAccount === undefined || options.servicePwd === undefined || options === undefined ) {
                console.warn('Oops, forget to add options...');
            } else {
                console.log("Trace Level is: " + options.debug);
                add.run(options);
            }
        });

commander
        .command('assign')
        .description('assign service account in QRS System')
        .option('-x, --username <QRS username>', 'account to login QRS system')
        .option('-P, --password <QRS password>', 'password to login QRS system')
        .option('-c, --customerName <customer name>', 'customer name from QRS System')
        .option('-s, --serviceAccount <service account>', 'new customer account in Work Directory System')
        .option('-D, --debug [trace|debug|info|warn|error]', 'enable debug mode', /trace|debug|info|warn|error/i, 'info')
        .action( function(options) {
            if( options.customerName === undefined || options.serviceAccount === undefined || options === undefined ) {
                console.warn('Oops, forget to add options...' );
                console.log( options );
            } else {
                console.log("Trace Level is: " + options.debug);
                assign.run( options );
            }
        });

commander
        .command('create')
        .description('create Propel URL')
        //.option('-f, --jsonFile <*.json>', 'Json format file to create Propel URL', checkFile, '')
        .option('-t, --tenantID <tenant ID>', 'tenant ID of customer')
        .option('-J, --billingID <jBilling Customer ID>', 'jBilling customer ID is required.', /\d*/)
        .option('-D, --debug [trace|debug|info|warn|error]', 'enable debug mode', /trace|debug|info|warn|error/i, 'info')
        .action( function(options) {
            if( options.tenantID === undefined || options.billingID === undefined || options === undefined ) {
                console.warn('Oops, forget to add options...');
            } else {

                var promise = collaborate.run( options );
                promise.then( function () {
                    var propelUploadJson = collaborate.propelUploadJson();
                    options.data = propelUploadJson;
                    create.run( options );
                });
            }
        });

commander
    .command('remove')
    .description('remove Identity Configurations on port 9200 for one Propel Org')
    .option('-t, --tenantID <tenant ID>', 'tenant ID of customer')
    .option('-D, --debug [trace|debug|info|warn|error]', 'enable debug mode', /trace|debug|info|warn|error/i, 'info')
    .action( function(options) {

        if( options === undefined || options.tenantID === undefined ) {

            console.warn('Oops, forget to add options...');
            return 0;
        }

        var promise = new Promise( function (resolve) {
            resolve();
        });

        promise
            .then( function () {

                return PropelFileManagementAPI.getParamFromPrimaryDataStorageInJson(
                    options.tenantID,
                    "urlName",
                    "propelAccount",
                    "propelPwd"
                );
            })
            .then( function ( customerJson ) {

                options.customerJson = customerJson;
                //console.log( customerJson);
                removeIdentity.run( options );
            });
    });

commander
        .command('configCatalog')
        .description('config Propel catalog & categories & aggregation in one step.')
        .option('-t, --tenantID <tenant ID>', 'tenant ID of customer')
        .option('-J, --billingID <jbilling ID>', 'j-billing ID is required, default: 123456', /\d*/, '123456')
        .option('-f, --jsonFile <*.json>', 'Json format file to config Propel catalog etc', checkFile, '')
        .option('-R, --reRun', 'flag to reRun all configurations')
        .option('-D, --debug [trace|debug|info|warn|error]', 'enable debug mode', /trace|debug|info|warn|error/i, 'info')
        .action( function(options) {
            if( options === undefined || options.billingID === undefined || options.tenantID === undefined ) {

                console.warn('Oops, forget to add options...');
            } else if( false === TenantManagementAPI.isTenantExisted( options.tenantID)){

                console.error("\n***** Tenant ID " + options.tenantID +" doesn't exist ******");
            }else {

                collaborate.run( options)
                    .then( function () {

                        var propelOrgCfgJson = collaborate.getPropelOrgCfgJson();
                        options.customerJson = propelOrgCfgJson;
                        options.customerJson.billingID = options.billingID;

                        configCatalog.run(options);
                    });
            }
        });

commander
        .command('clearCatalog')
        .description('clear configurations for Propel catalog & categories & aggregation in one step.')
        .option('-t, --tenantID <tenant ID>', 'tenant ID of customer')
        .option('-D, --debug [trace|debug|info|warn|error]', 'enable debug mode', /trace|debug|info|warn|error/i, 'info')
        .action( function(options) {
            if( options === undefined || options.tenantID === undefined ) {
                console.warn('Oops, forget to add options...');
            } else {

                var promise = new Promise( function (resolve, reject) {
                     resolve();
                });

                promise
                        .then( function () {

                            return PropelFileManagementAPI.getParamFromPrimaryDataStorageInJson(
                                options.tenantID,
                                "urlName",
                                "propelAccount",
                                "propelPwd"
                            );
                        })
                        .then( function ( customerJson ) {

                            options.customerJson = customerJson;
                            clearConfig.run( options );
                        });
            }
        });

commander
        .command('runall [name]', 'one-step run').alias('runAll')

commander
        .command('runpartial [name]', 'one-step run without Config Catalog & Categories & etc ').alias('runPartial')


commander.parse(process.argv);
