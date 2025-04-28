# Changelog

## Unreleased

- Add new form 'melding interne beslissing tot samenvoeging', bump services [DL-6361]

### Deploy Notes

```
drc restart migrations && drc logs -ft --tail=200 migrations
drc up -d enrich-submission
drc up -d submissions-dispatcher`
```

## v0.31.0 (2025-04-17)

- Add missing compose keys. [DL-6490]
- Reorganize delta consumers config to harmonize with the ecosystem
- Bump VDDS (vendor-data-distribution-service) for more async processing and
  reduced load on database/Virtuoso. [DL-6595]
- Update multiple forms. [DL-6602] [DL-6486] [DL-6487] [DL-6488]

### Deploy Notes

```
drc up -d submissions-consumer files-consumer vendor-management-consumer worship-submissions-email-notification-service vendor-login sparql-authorization-wrapper vendor-data-distribution op-public-consumer
```

**Bump of the VDDS and to run healing**

Set the VDDS healing operations directly onto Virtuoso. See the environment
variable config here:
https://github.com/lblod/vendor-data-distribution-service?tab=readme-ov-file#environment-variables,
and run the new deploy and (full) healing commands. This healing can take a
while; perhaps something for after work hours?

```
docker compose up -d vendor-data-distribution
docker compose exec vendor-data-distribution curl -X POST http://localhost/healing
```

**For updating the forms**

```
drc restart migrations && drc logs -ft --tail=200 migrations
drc up -d enrich-submission
```

## v0.30.4 (2025-02-27)
- Update semantic forms with `Opdrachthoudende vereniging met private deelname` classification. [DL-6447]
### Deploy Notes
#### Update Semantic Forms
```
drc restart migrations && drc logs -ft --tail=200 migrations
```
```
drc restart resource cache
```
```
drc up -d enrich-submission
```
## v0.30.3 (2025-02-03)
- Bump VDDS
## v0.30.2 (2025-01-22)
- Add Jaarrekening PEVA form [DL-6284]
## v0.30.1 (2025-01-09)
- bump-op-public-consumer to better handle language tags. [DL-6347]
### deploy notes
```
drc up -d op-public-consumer
```
## v0.30.0 (2024-12-13)
### General
- Bump VDDS to a version that respects the SPARQL_ENDPOINT* environment variables better. This is a bugfix.
- frontend v0.14.0: https://github.com/lblod/frontend-worship-decisions/blob/master/CHANGELOG.md#0120-2024-06-19
- update forms (adding submission cross referencing and kerkenbeleidsplan)
- add cross referencing components and service

### Deploy notes
##### worship-decisions-cross-reference
Ensure the environment variables are correctly set for `worship-decisions-cross-reference`, e.g. :
```
worship-decisions-cross-reference:
  environment;
    WORSHIP_DECISIONS_BASE_URL: "https://databankerediensten.lokaalbestuur.vlaanderen.be/search/submissions/"
```
The following links;
- DEV: "https://dev.databankerediensten.lokaalbestuur.lblod.info/search/submissions/"
- QA: "https://databankerediensten.lokaalbestuur.lblod.info/search/submissions/"
- PROD: "https://databankerediensten.lokaalbestuur.vlaanderen.be/search/submissions/"

#### Docker Commands
 - `drc restart migrations && drc logs -ft --tail=200 migrations`
 - `drc restart dispatcher resource cache vendor-data-distribution`
 - `drc up -d`

## 0.29.4 (2024-11-13)
### Toezicht
 - Update URI form "Aangewezen Burgemeester" [DL-6298]
### Deploy notes
```
drc restart migrations; drc up -d enrich-submission
```

## 0.29.3 (2024-11-08)

- Bump lblod/worship-submissions-graph-dispatcher-service to dispatch "Besluit over budget(wijziging) eredienstbestuur", and "Besluit over meerjarenplan(aanpassing) eredienstbestuur" also to betrokken besturen.

### Deploy notes

- Run the new version of the service

    drc up -d submissions-dispatcher

- Run healing (also called manual dispatching). Inspect the logs to see progress.

    drc exec submissions-dispatcher bash
    curl -X GET http://localhost/heal-submission

## 0.29.2 (2024-11-06)

- Bump lblod/worship-submissions-graph-dispatcher-service to include "Advies Budget(wijziging)" submissions for ABB.

### Deploy notes

- Run the new version of the service

    drc up -d submissions-dispatcher

- Run healing (also called manual dispatching). Inspect the logs to see progress.

    drc exec submissions-dispatcher bash
    curl -X GET http://localhost/heal-submission
## 0.29.1 (2024-09-20)
  - Fix dispatcher when multiple decision or creator types
### Deploy Notes
#### Docker Commands
  - `drc up -d submissions-dispatcher`
#### Manually re-dispatching the submissions
  - `curl '<ip-submissions-dispatcher-container>/manual-dispatch'`
## 0.29.0 (2024-09-05)
  - Bump frontend to `v0.13.0`.
### Deploy Notes
#### Docker Commands
 - `drc up -d frontend`
## 0.28.1 (2024-08-27)
  - Fix consumer mapping issue [DL-6152]
## 0.28.0 (2024-08-23)
 - updated consumer [DL-5911]
 - update submissions-dispatcher [DL-6143]
#### deploy notes
##### For the new consumer into account
- Note: the application will be down for a while.
- Ensure application goes down: `drc down`
- Ensure in `docker-compose.override.yml` (on prod)
  ```
  frontend:
    image: lblod/frontend-generic-maintenance
    environment:
      EMBER_MAINTENANCE_MESSAGE: "Databank Erediensten is momenteel niet beschikbaar wegens technisch onderhoud. Bedankt voor het begrip!"
      EMBER_MAINTENANCE_APP_TITLE: "Databank Erediensten"
      EMBER_MAINTENANCE_APP_URL: "databankerediensten.lokaalbestuur.vlaanderen.be"
    networks:
      - proxy
      - default
  # frontend:
  #   environment:
  #     EMBER_OAUTH_API_KEY: "key"
  #     EMBER_OAUTH_BASE_URL: "url"
  #     EMBER_OAUTH_LOGOUT_URL: "url"
  #     EMBER_OAUTH_REDIRECT_URL: "url"
   submissions-consumer:
     entrypoint: ["echo", "Service disabled to ensure re-sync OP  works propery"]
   update-bestuurseenheid-mock-login:
     entrypoint: ["echo", "Service disabled to ensure re-sync OP works propery"]
   op-public-consumer:
    environment:
      DCR_SYNC_BASE_URL: "https://organisaties.abb.vlaanderen.be"
      DCR_DISABLE_INITIAL_SYNC: "false"
      DCR_DISABLE_DELTA_INGEST: "false"
      DCR_LANDING_ZONE_DATABASE: "virtuoso" # for the initial sync, we go directly to virtuoso
      DCR_REMAPPING_DATABASE: "virtuoso" # for the initial sync, we go directly to virtuoso
  ```
- `drc up -d migrations frontend`
  - That might take a while.
- `drc up -d --remove-orphans `
- Wait until the consumer is finished.
- Enable the frontend, submissions-consumer and update-bestuurseenheid-mock-login
- Ensure op-public-consumer in `docker-compose.override.yml` is syncing with database again
- So the final `docker-compose.override.yml` will look like
  ```
  # frontend:
  #  image: lblod/frontend-generic-maintenance
  #  environment:
  #    EMBER_MAINTENANCE_MESSAGE: "Databank Erediensten is momenteel niet beschikbaar wegens technisch onderhoud. Bedankt voor het begrip!"
  #    EMBER_MAINTENANCE_APP_TITLE: "Databank Erediensten"
  #    EMBER_MAINTENANCE_APP_URL: "databankerediensten.lokaalbestuur.vlaanderen.be"
  #  networks:
  #    - proxy
  #    - default
   frontend:
     environment:
       EMBER_OAUTH_API_KEY: "key"
       EMBER_OAUTH_BASE_URL: "url"
       EMBER_OAUTH_LOGOUT_URL: "url"
       EMBER_OAUTH_REDIRECT_URL: "url"
   op-public-consumer:
    environment:
      DCR_SYNC_BASE_URL: "https://organisaties.abb.vlaanderen.be"
      DCR_DISABLE_INITIAL_SYNC: "false"
      DCR_DISABLE_DELTA_INGEST: "false"
  ```

### 0.27.1 (2024-07-29)
#### General

- Bump `submissions-dispatcher` to v0.15.3 to add another improvement on the healing.

## 0.27.0 (2024-07-25)

### General
- Bump VDDS to a version that respects the SPARQL_ENDPOINT* environment variables better. This is a bugfix.
- frontend v0.12.0: https://github.com/lblod/frontend-worship-decisions/blob/master/CHANGELOG.md#0120-2024-06-19
- Bump `submissions-dispatcher` to v0.15.1 to improve healing. (DL-5895)
  * This healing is faster and does not remove and re-insert all the data for every submission. It is much more selective.
- Bump `submissions-dispatcher` to v0.15.2 to fix dispatching "Budget(wijziging)" Submission types. (DL-5997)
- Link Toezichthoudende Provincie Antwerpen to "Orthodoxe Parochie Heilige Sophrony de Athoniet" (DL-6014)

### Deploy notes
- `drc up -d frontend search-query-management`
- `drc restart resource cache`
- Run (new and improved) healing on the `submissions-dispatcher`.
  * `drc exec submissions-dispatcher bash`
  * `apk add curl`
  * `curl -X GET http://localhost/heal-submission`
- Not needed because healing will take care of this, but on a time budget you could do:
  * `drc exec submissions-dispatcher bash`
  * `apk add curl`
  * `curl -X GET http://localhost/heal-submission?subject=http://data.lblod.info/submissions/66311321F0F686D7CD7EFB29`

## 0.26.1 (2024-05-29)
  - Fix custom info label field in forms LEKP-rapport - Melding correctie authentieke bron and LEKP-rapport - Toelichting Lokaal Bestuur (DL-5934)
### Deploy Notes
  - `drc up -d enrich-submission; drc restart migrations resource cache`
## 0.26.0 (2024-05-16)

### General
- Add two new optional columns `?worshipAdministrativeUnitRelationship` and `?worshipAdministrativeUnitRelationshipLabel` that will show missing relations between EBs and CBs for `links-between-worship-services-and-admin-units` report (DL-5013)
- Update forms
  - Adjust LEKP rapport Klimaattafels (DL-5832)
  - Add new LEKP rapport Wijkverbeteringscontract (DL-5829)
- Added physical files to the VDDS config to allow for file downloads via the file service

### Deploy Notes
- `drc up -d enrich-submission; drc restart migrations resource cache report-generation`

#### `vendor-data-distribution-service` historical data

You must run healing to create historical data in the vendor graphs for the physical files. Use the following command:

```bash
drc exec vendor-data-distribution curl -X POST -H "Content-Type: application/json" -d '
  {
    "skipDeletes": true,
    "onlyTheseTypes": [ "http://rdf.myexperiment.org/ontologies/base/Submission" ]
  }
  ' http://localhost/healing
```

**This can take up multiple hours of high triplestore usage! Perform outside of peak hours.**

## v0.25.0 (2024-04-19)
- Add `vendor-management-consumer` to fetch vendor data from `app-digitaal-loket` (DL-5667)
- Add `vendor-data-distribution` and config to copy data to vendor graphs based on config
- Bump `worship-submissions-email-notification-service` to `v1.2.0` (DL-5742)
  - See full change [here](https://github.com/lblod/worship-submissions-email-notification-service/pull/3)
### Deploy Notes
#### `vendor-management-consumer` Setup
Place the following inside `docker-compose.override.yml`:

```yaml
vendor-management-consumer:
  environment:
    BATCH_SIZE: "500"
    DCR_SYNC_BASE_URL: [FILL-WITH-QA/PROD-URL]
    DCR_DISABLE_INITIAL_SYNC: 'true' # Switch to false when system is ready to consume data
    DCR_SYNC_LOGIN_ENDPOINT: '[DCR_SYNC_BASE_URL]/sync/vendor-management/login'
    DCR_SECRET_KEY: "key" # Key must match the one from the `vendor-management` delta producer in `app-digitaal-loket`
```
#### `vendor-data-distribution-service` Setup
Add the following to `docker-compose.override.yml`:

```yml
vendor-data-distribution:
  environment:
    HOSTNAME: "APP_HOSTNAME"
```
where `APP_HOSTNAME` is `VIRTUAL_HOST` found under the `environment` section of the `identifier` tag inside `docker-compose.override.yml`.
#### `vendor-data-distribution-service` historical data
You must run healing to create historical data in the vendor graphs. Use a POST call with the newly added features to speed up the healing. The following should suffice:
```bash
drc exec vendor-data-distribution curl -X POST -H "Content-Type: application/json" -d '
  {
    "skipDeletes": true,
    "onlyTheseTypes": [ "http://rdf.myexperiment.org/ontologies/base/Submission" ]
  }
  ' http://localhost/healing
```
**This can take up multiple hours of high triplestore usage! Perform outside of peak hours.**

#### Docker Commands
- `drc up -d vendor-management-consumer submissions-dispatcher worship-submissions-email-notification-service`
- `drc logs -ft --tail=200 vendor-management-consumer`
  - > Make sure the logs contain no issues.
- Switch `DCR_DISABLE_INITIAL_SYNC` inside `vendor-management-consumer` to `false`
- `drc up -d vendor-management-consumer`

Observe the logs and make sure the process completes. Once vendors have been consumed, run the following commands:

- `drc up -d vendor-login sparql-authorization-wrapper vendor-data-distribution`
- `drc logs -ft --tail=200 vendor-data-distribution`
  - > Make sure the service is running.
- `drc restart dispatcher database deltanotifier`
- Run the healing process mentioned in the **`vendor-data-distribution-service` historical data** section above.
- `drc logs -ft --tail=200 vendor-data-distribution`
  - > The progress bar may not be visible clearly due to the terminal buffer flushing quickly, but a `Processed x/x (100%) ...` log entry should be visible once the healing process completes.

## v0.24.0 (2024-03-14)
- Update forms
  - Adding new form Aanduiding en eedaflegging van de aangewezen burgemeester (DL-5669)
  - Adding new form Strandconcessies - reddingsdiensten kustgemeenten (DL-5625)
  - Adding new form Melding onvolledigheid inzending eredienstbestuur (DL-5643)
  - Adding new form Opstart beroepsprocedure naar aanleiding van een beslissing (DL-5646)
  - Adding informational text to forms to minimize usage of the wrong forms (DL-5665)
  - Adding new form Afschrift erkenningszoekende besturen (DL-5670)
- Bump submissions-dispatcher to have more control and faster execution time (DL-5710)
- Bump `submissions-dispatcher` to `v0.14.0` (DL-5670)
- Frontend [v0.11.0](https://github.com/lblod/frontend-worship-decisions/blob/master/CHANGELOG.md#0100-2024-02-07) (DL-5735)
### Deploy notes
- drc up -d enrich-submission frontend submissions-dispatcher; drc restart migrations resource cache
#### Prod
`lblod/worship-submissions-graph-dispatcher-service:0.13.0` will be running in `docker-compose.override.yml`. Ensure whe deploying to remove this line in the file.
## v0.23.0 (2024-02-16)
- Updated a number of services as part of regular maintenance [DL-5672].
### Deploy notes
- Virtuoso Upgrade! Please follow the procedure as described in [this excellent guide](https://github.com/Riadabd/upgrade-virtuoso) for upgrading the triplestore.
## v0.22.1 (2024-02-07)
Frontend [v0.10.1](https://github.com/lblod/frontend-worship-decisions/blob/master/CHANGELOG.md#0100-2024-02-07):
- [DL-5661] Fix the ACM/IDM login
### Deploy notes
- Remove the image override for the `frontend` service if it exists.
- `drc up -d frontend`
## v0.22.0 (2024-02-07)
Frontend [v0.10.0](https://github.com/lblod/frontend-worship-decisions/blob/master/CHANGELOG.md#0100-2024-02-07):
- [DL-5637] Sort submissions based on the sent date (descending) by default
### Deploy notes
- Remove the v0.10.0 image override for the `frontend` service if it exists.
- `drc up -d frontend`
## 0.21.0 (2024-01-12)
- Update forms
    - New forms LEKP Collectieve Energiebesparende Renovatie, Fietspaden, Sloopbeleidsplan
    - New forms Niet-bindend advies op statuten and Niet-bindend advies op oprichting
    - Change form LEKP Melding correctie authentieke bron, removed field "type correctie"
### Deploy instructions
- drc up -d enrich-submission; drc restart migrations resource cache
## 0.20.0 (2023-12-14)
 - Fixed a bug (which also broke the reporting) where submissions where ingested in <http://mu.semte.ch/graphs/organizations/undefined/LoketLB-databankEredienstenGebruiker>
 - Resotred old budget submissions dispatching: [see](https://github.com/lblod/worship-submissions-graph-dispatcher-service/pull/16)
## 0.19.0 (2023-11-27)
- Adjusting report (without email notifications) to include Gemeenten/Provincies
### Deploy notes
- drc restart report-generation
## 0.18.0 (2023-11-15)
- Bump op-public-consumer and submissions-consumer
- Update forms
### Deploy notes
- drc up -d enrich-submission op-public-consumer submissions-consumer; drc restart migrations resource cache
## 0.17.0 (2023-10-17)
- Update forms (bundle)
- Bump worship-submissions-graph-dispatcher-service v0.10.0
### Deploy notes
1. drc restart migrations search-query-management
2. drc up -d worship-submissions-graph-dispatcher-service
## 0.16.0 (2023-10-13)
- Adding a new generated report worshipServicesWithoutEmailNotifications

### Deploy notes
1. drc restart report-generation

## 0.15.0 (2023-09-08)
- Bump frontend from v0.8.0 to v0.9.0
- Adding a new filter field (filter by specific date)

### Deploy notes
1. drc up -d frontend
2. drc restart search-query-management

## 0.14.0 (2023-07-24)
- Bump worship-submissions-email-notification-service (Adjust cron interval to set it every day at 10:00)
- Fixing bestuurseenheid filter

### Deploy notes
1. drc up -d worship-submissions-email-notification-service once the value RUN_INTERVAL is changed in docker-compose.yml and docker-compose.override.yml

2. drc restart migrations then search-query-management after migrations are done.
## 0.13.0 (2023-06-30)
- Added extra forms
## 0.12.0 (2023-06-19)
- Adding mailing feature
## 0.11.1 (2023-06-02)
### General
- bump graph dispatcher
## 0.11.0 (2023-06-02)
### General data
  - flush, rerun op sync migrations to fix typeBetrokkenheid
### Deploy instructions
```
drc restart migrations resource cache; drc up -d;
```
- re-sync erediensten from OP according to instructions

## 0.10.1 (2023-06-02)
### General
  - hotfix in frontend to fix 'empty screen' on login
#### deploy instructions
```
drc up -d; drc restart resource cache
```
## 0.10.0 (2023-04-24)
### General
  - new forms
## 0.9.1 (2023-04-14)
### General
  - bump consumer (more robust version)
## 0.9.0 (2023-04-12)
### General
  - improved version of submissions dispatcher
## 0.8.1 (2023-04-11)
### General
  - hotfix submission submissions dispatcher
## 0.8.0 (2023-04-07)
### General
 - Added mock-login creator on new bestuurseenheid
 - Consume data from Organisations portal: Erediensten
## 0.7.0 (2023-03-24)
- Adding service that creates mock accounts automatically
- Adding extra report for worship services
- Fixing links between worship services
- Bumping frontend-worship-decisions to v0.6.0
## 0.6.1 (2023-03-09)
- peformance report
## 0.6.0 (2023-03-07)
- added dashboard
- added first report: inzendingen per bestuurseenheid
## 0.5.0 (2023-03-02)
- bump submissions-dispatcher: manual dispatcher and faster initial sync
## 0.4.1 (2023-02-23)
- bump submissions-dispatcher with performance optimisation
## 0.4.0 (2023-02-10)
- bump consumer
## 0.3.0 (2023-02-08)
- update forms
## 0.2.1 (2023-01-25)
- data corrections
## 0.2.0 (2023-01-24)
- update submissions dispatcher (incl. dispatch rules)
- update forms
- added multiple bestuurseenheden and linked organisations
- bump virtuoso
- update mu-auth config
- migrations for ACM updates
## 0.1.0 (2022-11-29)
### :sunrise: Show ourselves to the world
- initial release
