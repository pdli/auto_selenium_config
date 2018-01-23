/**
 * Created by pengl on 11/23/2017.
 */

const PropelFileManagement = require('./PropelFileManagement.js');

module.exports.isTenantExisted = function ( tenantID ){

    return PropelFileManagement.getParamFromPrimaryDataStorageInJson( tenantID, "tenantID" ).then( function ( json ) {

        console.log( json );

        if( json.tenantID === tenantID && undefined !== json.tenantID ){

            return true;
        }

        return false;
    });
}