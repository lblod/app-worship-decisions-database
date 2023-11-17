import { generateReportFromData, batchedQuery } from '../helpers.js';

export default {
  cronPattern: '0 0 5 * * 0', // at 05:00 on Sunday 
  name: 'servicesWithoutEmailNotifications',
  execute: async () => {
    const reportData = {
      title: `List of worship services and Gemeenten/Provincies without email notifications`,
      description: `Report listing of all worship services (RO, EB, CB) + Gemeenten/Provincies without emails set`,
      filePrefix: `services-without-email-notifications`,
    };
    console.log('Generate worship services + Gemeenten/Provincies without email notifications report');

    /**
     * Query that extracts all worship services and Gemeenten/Provincies without emails (ext:mailAdresVoorNotificaties).
     **/
    const queryString = `
    PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
    
    SELECT DISTINCT ?administrativeUnit ?administrativeUnitLabel ?administrativeUnitClassificationLabel
    WHERE {
      ?administrativeUnit a ?bestuurseenheidType ;
        skos:prefLabel ?administrativeUnitLabel ;
        besluit:classificatie ?administrativeUnitClassification ;
        besluit:classificatie/skos:prefLabel ?administrativeUnitClassificationLabel .
    
      FILTER (?administrativeUnitClassification IN (
        <http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/5ab0e9b8a3b2ca7c5e000000>,
        <http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/5ab0e9b8a3b2ca7c5e000001>,
        <http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/66ec74fd-8cfc-4e16-99c6-350b35012e86>,
        <http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/f9cac08a-13c1-49da-9bcb-f650b0604054>,
        <http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/36372fad-0358-499c-a4e3-f412d2eae213>
      )).
    
      FILTER NOT EXISTS {
        ?administrativeUnit ext:wilMailOntvangen ?hasEmailNotifications ; 
                                   ext:mailAdresVoorNotificaties ?emailAddress .
      }
    }
    ORDER BY ?administrativeUnitClassificationLabel      
    `;
    const queryResponse = await batchedQuery(queryString);
    const data = queryResponse.results.bindings.map((unit) => {
      return {
        administrativeUnit: unit.administrativeUnit.value,
        administrativeUnitLabel: unit.administrativeUnitLabel.value,
        administrativeUnitClassificationLabel: unit.administrativeUnitClassificationLabel.value,
      };
    });

    await generateReportFromData(data, [
      'administrativeUnit',
      'administrativeUnitLabel',
      'administrativeUnitClassificationLabel',
    ], reportData);
  }
};
