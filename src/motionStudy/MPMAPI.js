const MPMGroup = {
    Operations: 'Operations',
    ProcessPlans: 'ProcessPlans',
};

const MPMOp = {
    CheckIn: 'CheckIn',
    CheckOut: 'CheckOut',
};

/**
 * Low-level MPM API operations
 */
export class MPMAPI {
    /**
     * @param {string} baseUrl - Base url of windchill instance
     * @param {string} username
     * @param {string} password
     */
    constructor(baseUrl, username, password) {
        this.baseUrl = baseUrl;
        this.auth = 'Basic ' + btoa(username + ':' + password);
        this.csrfNonce = null;
    }

    async getCSRFToken() {
        const headers = new Headers();
        headers.append('Authorization', this.auth);

        const res = await fetch(`${this.baseUrl}/Windchill/servlet/odata/PTC/GetCSRFToken()`, {
            headers,
            redirect: 'follow',
        });

        const data = await res.json();
        this.csrfNonce = data.NonceValue;
        return this.csrfNonce;
    }

    async getOperations(processPlanId) {
        if (!this.csrfNonce) {
            await this.getCSRFToken();
        }
        const headers = new Headers();
        headers.append('CSRF_NONCE', this.csrfNonce);
        headers.append('X-CSRF-NONCE', this.csrfNonce);
        headers.append('Content-Type', 'application/json');
        headers.append('Authorization', this.auth);

        const criteria = JSON.stringify({
            'processPlanNavigationCriteria': {
                'ApplicableType': 'PTC.MfgProcMgmt.ProcessPlan',
                'ApplyToTopLevelObject': true,
                'HideUnresolvedDependents': true,
                'UseDefaultForUnresolved': false,
                'ConfigSpecs': [{
                    '@odata.type': '#PTC.NavCriteria.WTPartStandardConfigSpec',
                    'LifeCycleState': {
                        'Value': null
                    },
                    'Variation1': {
                        'Value': null
                    },
                    'Variation2': {
                        'Value': null
                    },
                    'View': 'Manufacturing',
                    'WorkingIncluded': false
                }]
            },
            'relatedAssemblyNavigationCriteria': {
                'ApplicableType': 'PTC.ProdMgmt.Part',
                'ApplyToTopLevelObject': true,
                'HideUnresolvedDependents': true,
                'UseDefaultForUnresolved': false,
                'ConfigSpecs': [{
                    '@odata.type': '#PTC.NavCriteria.WTPartStandardConfigSpec',
                    'LifeCycleState': {
                        'Value': null
                    },
                    'Variation1': {
                        'Value': null
                    },
                    'Variation2': {
                        'Value': null
                    },
                    'View': 'Manufacturing',
                    'WorkingIncluded': false
                }]
            }
        });

        const requestOptions = {
              method: 'POST',
              headers,
              body: criteria,
        };

        const res = await fetch(`${this.baseUrl}/Windchill/servlet/odata/v6/MfgProcMgmt/ProcessPlans('${processPlanId}')/PTC.MfgProcMgmt.GetBOPWithInlineNavCriteria?$expand=Components($expand=OperationHolder,OperationHolderUsageLink,ConsumedParts($expand=Part,OperationToPartLink,PartPathOccurrenceLinks);$levels=max)`, requestOptions);
        return await res.json();
    }

    async getProcessPlans(filter) {
        if (!this.csrfNonce) {
            await this.getCSRFToken();
        }
        const headers = new Headers();
        headers.append('CSRF_NONCE', this.csrfNonce);
        headers.append('X-CSRF-NONCE', this.csrfNonce);
        headers.append('Content-Type', 'application/json');
        headers.append('Authorization', this.auth);

        const requestOptions = {
              method: 'GET',
              headers,
        };
        let url = `${this.baseUrl}/Windchill/servlet/odata/v6/MfgProcMgmt/ProcessPlans`;
        if (filter) {
            url += `?$filter=${encodeURIComponent(filter)}`;
        }
        const res = await fetch(url, requestOptions);
        return await res.json();
    }

    /**
     * @param {string} operationId
     * @param {[varName: string]: any} vars
     */
    async patchVariables(operationId, vars) {
        if (!this.csrfNonce) {
            await this.getCSRFToken();
        }
        const headers = new Headers();
        headers.append('Authorization', this.auth);
        headers.append('Content-Type', 'application/json');
        headers.append('CSRF_NONCE', this.csrfNonce);
        headers.append('X-CSRF-NONCE', this.csrfNonce);

        const raw = JSON.stringify(vars);

        const requestOptions = {
          method: 'PATCH',
          headers,
          body: raw,
        };

        const res = await fetch(`${this.baseUrl}/Windchill/servlet/odata/v6/MfgProcMgmt/Operations('${operationId}')`, requestOptions);
        const data = await res.json();
        return data;
    }

    async checkOutProcessPlan(processPlanId) {
        return await this.checkInOrOut({
            id: processPlanId,
            group: MPMGroup.ProcessPlans,
            op: MPMOp.CheckOut,
        });
    }

    async checkOutOperation(operationId) {
        return await this.checkInOrOut({
            id: operationId,
            group: MPMGroup.Operations,
            op: MPMOp.CheckOut,
        });
    }

    async checkInProcessPlan(processPlanId) {
        return await this.checkInOrOut({
            id: processPlanId,
            group: MPMGroup.ProcessPlans,
            op: MPMOp.CheckIn,
        });
    }

    async checkInOperation(operationId) {
        return await this.checkInOrOut({
            id: operationId,
            group: MPMGroup.Operations,
            op: MPMOp.CheckIn,
        });
    }

    async checkInOrOut(params) {
        const {id, group, op} = params;

        if (!this.csrfNonce) {
            await this.getCSRFToken();
        }
        const headers = new Headers();
        headers.append('Authorization', this.auth);
        headers.append('CSRF_NONCE', this.csrfNonce);
        headers.append('X-CSRF-NONCE', this.csrfNonce);

        const requestOptions = {
          method: 'POST',
          headers,
        };

        const res = await fetch(`${this.baseUrl}/Windchill/servlet/odata/v6/MfgProcMgmt/${group}('${id}')/PTC.MfgProcMgmt.${op}`, requestOptions);
        let doc = await res.json();
        // Alias to match prevailing conventions
        doc.id = doc.ID;
        return doc;
    }
}


