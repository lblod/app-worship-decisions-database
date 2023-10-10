import { generateReportFromData, batchedQuery } from '../helpers.js';

export default {
  cronPattern: '0 0 5 * * 0', // at 05:00 on Sunday 
  name: 'worshipServicesWithoutEmailNotifications',
  execute: async () => {
    const reportData = {
      title: `List of worship services without email notifications`,
      description: `Report listing of all worship services (RO, EB, CB) without emails set`,
      filePrefix: `worship-services-without-email-notifications`,
    };
    console.log('Generate worship services without email notifications report');

    /**
     * Query that extracts all worship services without emails (ext:mailAdresVoorNotificaties).
     **/
    const queryString = `
    PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
    PREFIX ere: <http://data.lblod.info/vocabularies/erediensten/>
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
    
    SELECT DISTINCT ?worshipAdministrativeUnit ?worshipLabel ?worshipClassification
    WHERE {
      VALUES ?worshipType {
        ere:BestuurVanDeEredienst
        ere:CentraalBestuurVanDeEredienst
        ere:RepresentatiefOrgaan
      }
      ?worshipAdministrativeUnit a ?worshipType ;
        skos:prefLabel ?worshipLabel ;
        besluit:classificatie/skos:prefLabel ?worshipClassification .
    
      FILTER NOT EXISTS {
        ?worshipAdministrativeUnit ext:wilMailOntvangen ?hasEmailNotifications ; 
                                   ext:mailAdresVoorNotificaties ?emailAddress .
      }
    }
    ORDER BY ?worshipType    
    `;
    const queryResponse = await batchedQuery(queryString);
    const data = queryResponse.results.bindings.map((unit) => {
      return {
        worshipAdministrativeUnit: unit.worshipAdministrativeUnit.value,
        worshipLabel: unit.worshipLabel.value,
        worshipClassification: unit.worshipClassification.value,
      };
    });

    await generateReportFromData(data, [
      'worshipAdministrativeUnit',
      'worshipLabel',
      'worshipClassification',
    ], reportData);
  }
};
