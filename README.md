# Worship Decision Database

Backend API providing exposing the worship decision data.
Started from the [mu-project](https://github.com/mu-semtech/mu-project) template.

## Running and maintaining

General information on running, maintaining and installing the stack.

### How to setup the stack

> **Prerequisites**
> - [docker](https://docs.docker.com/get-docker/), [docker-compose](https://docs.docker.com/get-docker/) and [git](https://git-scm.com/downloads) are installed on your system
> - [cloned the repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository)

#### Running the dev. setup

Move in to the directory:
```shell
cd app-worship-decision-database
```
Start the system:
```shell
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```
> docker-compose **up** CLI [reference](https://docs.docker.com/compose/reference/up/).

Wait for everything to boot to ensure clean caches. You may choose to monitor the migrations service in a separate terminal to and wait for the overview of all migrations to appear:

```shell
docker-compose logs -f --tail=100 migrations
```
> docker-compose **logs** CLI [reference](https://docs.docker.com/compose/reference/logs/).

To ease all typing for `docker-compose` commands, start by creating the following files in the directory of the project.
A `docker-compose.override.yml` file with following content:
```
version: '3.7'
```
And an `.env` file with following content:
```
COMPOSE_FILE=docker-compose.yml:docker-compose.dev.yml:docker-compose.override.yml
```
> docker-compose CLI env. vars. [reference](https://docs.docker.com/compose/reference/envvars/)

Start the system:
```shell
docker-compose up
```
## Ingesting data
### administrative units
Only the 'normal' (i.e. non-worship) administrative units are provided by default.
If you need to ingest the data for worship administrative units, you will need to ingest the data through deltas from:

  * [Organisations portal](https://organisaties.abb.vlaanderen.be)
    * Note: this app also has a development and qa environment available.
#### steps
  - The next steps assume `.env` file has been set, cf. supra.
  - Ensure the following configuration is defined in the `docker-compose.override.yml`
    ```
    op-public-consumer:
        environment:
          DCR_SYNC_BASE_URL: "https://organisaties.abb.vlaanderen.be"
          DCR_DISABLE_INITIAL_SYNC: "true"
          DCR_DISABLE_DELTA_INGEST: "true"
          DCR_LANDING_ZONE_DATABASE: "virtuoso" # for the initial sync, we go directly to virtuoso
          DCR_REMAPPING_DATABASE: "virtuoso" # for the initial sync, we go directly to virtuoso
    update-bestuurseenheid-mock-login:
        entrypoint: ["echo", "Service-disabled to not confuse the service"]
    submissions-consumer:
        entrypoint: ["echo", "Service-disabled to not confuse the service"]
    ```
  - `docker-compose up -d`
  - Ensure all migrations have run and the stack is started and running properly.
  - Extra step in case of a resync, run:
    ```
    docker-compose exec op-public-consumer curl -X POST http://localhost/flush
    docker-compose logs -f --tail=200 op-public-consumer
    ```
      - This should end with `Flush successful`.
  - Update `docker-compose.override.yml` with
    ```
      op-public-consumer:
        environment:
          DCR_SYNC_BASE_URL: "https://organisaties.abb.vlaanderen.be"
          DCR_DISABLE_INITIAL_SYNC: "false" # -> this changed
          DCR_DISABLE_DELTA_INGEST: "false" # -> this changed
          # DCR_LANDING_ZONE_DATABASE: "virtuoso" # -> this changed
          # DCR_REMAPPING_DATABASE: "virtuoso" # -> this changed
    ```
 - `docker-compose up -d`
 - This might take a while if `docker-compose logs op-public-consumer |grep success`
      Returns: `Initial sync http://redpencil.data.gift/id/job/URI has been successfully run`; you should be good.
      (Your computer will also stop making noise)
 - In `docker-compose.override.yml`, remove the disabled service
       ```
        update-bestuurseenheid-mock-login:
            entrypoint: ["echo", "Service-disabled to not confuse the service"]
        submissions-consumer:
            entrypoint: ["echo", "Service-disabled to not confuse the service"]
       ```
       The mock-logins will be created when a cron job kicks in. You can control the moment it triggers by playing with the `CRON_PATTERN` variable.
       See the `README.md` of the related service for more options.
### submissions
The app comes with no submissions data, because it depends on external datasources.

  *  [Submissions (sourced by loket)](https://loket.lokaalbestuur.vlaanderen.be/)

You can follow the following procedure, for all data sources (currently there is only one).

The ingestion should be a one time operation per deployment, and is currenlty semi-automatic for various reasons (mainly related to performance)
The ingestion is disabled by default. It is recommended, for performance, to start only one initial ingest at a time.

To proceed:
1. make sure the app is up and running. And the migrations have run.
2. In docker-compose.override.yml (preferably) override the following parameters for submissions-consumer
```
# (...)
  submissions-consumer:
    environment:
      BATCH_SIZE: "100" # if virtuoso is in prod mode, you can safely beef this up to 500/1000
      DCR_SYNC_LOGIN_ENDPOINT: 'https://loket.lblod.info/sync/worship-submissions/login' # The endpoint of your choice (see later what to choose)
      DCR_SYNC_BASE_URL: 'https://loket.lblod.info/'
      DCR_SECRET_KEY: "the-key-of-interest"
      DCR_DISABLE_INITIAL_SYNC: 'false'
```
3. `docker-compose up -d submissions-consumer` should start the ingestion.
  This might take a while if yoh ingest production data.
4. Check the logs, at some point this message should show up
  `Initial sync was success, proceeding in Normal operation mode: ingest deltas`
   or execute in the database:
   ```
   PREFIX adms: <http://www.w3.org/ns/adms#>
   PREFIX task: <http://redpencil.data.gift/vocabularies/tasks/>
   PREFIX dct: <http://purl.org/dc/terms/>
   PREFIX cogs: <http://vocab.deri.ie/cogs#>

   SELECT ?s ?status ?created WHERE {
     ?s a <http://vocab.deri.ie/cogs#Job> ;
       adms:status ?status ;
       task:operation <http://redpencil.data.gift/id/jobs/concept/JobOperation/deltas/consumer/initialSync/submissions> ;
       dct:created ?created ;
       dct:creator <http://data.lblod.info/services/id/submissions-consumer> .
    }
    ORDER BY DESC(?created)
   ```
5. Now the submissions are synced, a smilar procedure for the syncing of the files.
```
# (...)
  files-consumer:
    environment:
      DISABLE_AUTOMATIC_SYNC: "true"
      DISABLE_INITIAL_SYNC: "false"
      FILES_ENDPOINT_BASE_URL: "https://loket.lblod.info/" # The endpoint of your choice (see later what to choose)
      SYNC_LOGIN_ENDPOINT: "https://loket.lblod.info/sync/worship-submissions/login"
      SECRET_KEY: "the-relevant-key"
```
6. Check the logs and wait for the message: `Full sync finished`. Or query:
```
   PREFIX adms: <http://www.w3.org/ns/adms#>
   PREFIX task: <http://redpencil.data.gift/vocabularies/tasks/>
   PREFIX dct: <http://purl.org/dc/terms/>
   PREFIX cogs: <http://vocab.deri.ie/cogs#>

   SELECT ?s ?status ?created WHERE {
     ?s a <http://vocab.deri.ie/cogs#Job> ;
       adms:status ?status ;
       task:operation <http://redpencil.data.gift/id/jobs/concept/JobOperation/deltas/consumer/physicalFileSync> ;
       dct:created ?created.
    }
    ORDER BY DESC(?created)
```
7. [OPTIONAL] Sometimes things might go wrong. It can help to rebuild the index ``/bin/bash config/scripts/reset-elastic.sh` to troubleshoot.
8. Once ok, you will have to enable automatic-syncing for the files consumer
```
# (...)
  files-consumer:
    environment:
      # (...)
      - DISABLE_AUTOMATIC_SYNC: "false"
```
9. `drc restart resource cache search-query-management` is still needed after the intiial sync.

## configuring the dashboard
### accessing the dashboard from your local machine
Since we use dispatcher v2, which dispatches on hostname, we'll have to update `/etc/config/hosts`.
Add an entry similar to the following. Ensure the first part of the domain starts with `dashboard`.:
```
127.0.0.1 dashboard.localhost
```
In this example, combined with `docker-compose.dev.yml` it should be accessible on `dashboard.localhost:81`

### Additional notes:
#### mu-search is disabled
For performance reasons, mu-search is currently disabled.
#### elasticsearch max_shards_per_node
By default elastic search has not enough shards for all org graph.
This will crash search and a workaround should be applied
```
drc exec elasticsearch bash
curl -X PUT localhost:9200/_cluster/settings -H "Content-Type: application/json" -d '{ "persistent": { "cluster.max_shards_per_node": "7000" } }'
exit
drc up -d
```

#### Performance
- The default virtuoso settings might be too weak if you need to ingest the production data. Hence, there is better config, you can take over in your `docker-compose.override.yml`
```
  virtuoso:
    volumes:
      - ./data/db:/data
      - ./config/virtuoso/virtuoso-production.ini:/data/virtuoso.ini
      - ./config/virtuoso/:/opt/virtuoso-scripts
```

#### Scripts
- Build elasticsearch config:
  * make the `scripts/project/build-elasticsearch-config/build.sh` executable (`chmod a+x`)
  * make sure the virtuoso image is running
  * run `mu script project-scripts build-elasticsearch-config`

## Vendor API

Some vendors need access to specific data inside Loket; as such, we expose an API that allows them to query data from their own designated graphs.

There are three services involved:
* [vendor-login-service](https://github.com/lblod/vendor-login-service)
* [sparql-authorization-wrapper-service](https://github.com/lblod/sparql-authorization-wrapper-service)
* [vendor-data-distribution-service](https://github.com/lblod/vendor-data-distribution-service/)

In brief, the API flows as follows:
* The `vendor-login` service allows a vendor with an API key to log into `app-digitaal-loket` and provides said vendor with an active session.
* The `sparql-authorization-wrapper` service proxies SPARQL requests from the vendor to `app-digitaal-loket` by intercepting the request and adding specific authorization rules to allow/disallow this request; these rules are defined in `config/sparql-authorization-wrapper/filter.js`.
  * `sparql-authorization-wrapper` checks whether a vendor has an active session by querying the sessions created by `vendor-login`.
* The `vendor-data-distribution` service copies data inside `app-digitaal-loket` to designated graphs, which are made accessible through the SPARQL endpoint; the rules defining what gets copied are defined in `config/vendor-data/subjectsAndPaths.js`.

### Usage

#### vendor-login-service

To log in as a vendor, run the following command:

```sh
curl -v -X POST \
      -H "Content-Type: application/json" \
      -b CookieJar.tsv -c CookieJar.tsv \
      -d '{
    "organization": "ORG_URI",
    "publisher": {
        "uri": "VENDOR_URI",
        "key": "VENDOR_API_KEY"
    }
}' http://localhost:90/vendor/login
```

where:
* `ORG_URI` is the URI of the organization the vendor can act on behalf of.
* `VENDOR_URI` is the URI of the relevant vendor.
* `VENDOR_API_KEY` is the API key the vendor uses to log in.

`VENDOR_URI`, `VENDOR_API_KEY` and `ORG_URI` can be found by querying the database as follows:

```sparql
PREFIX muAccount: <http://mu.semte.ch/vocabularies/account/>
PREFIX mu:        <http://mu.semte.ch/vocabularies/core/>
PREFIX foaf:      <http://xmlns.com/foaf/0.1/>
PREFIX ext:       <http://mu.semte.ch/vocabularies/ext/>

SELECT DISTINCT ?vendorURI ?vendorName ?vendorAPIKey ?organizationURI WHERE {
  ?s a foaf:Agent, ext:Vendor ;
    muAccount:key ?key ;
    muAccount:canActOnBehalfOf ?organizationURI ;
    foaf:name ?vendorName .
}
```

This query will return the **vendorURI**, **vendorName**, **vendorAPIKey** and **organizationURI**; **vendorName** is not used in the cURL request but is useful information to have.

#### sparql-authorization-wrapper-service

As mentioned in the summary above, this service acts as a proxy between the vendor and `app-digitaal-loket` and is used to append extra authorization rules in addition to making sure the client is allowed to access the requested data.

After logging in as a vendor, run the following command to execute a query (note the use of the same `CookieJar.tsv` from the previous section):

```sh
curl -s -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -b CookieJar.tsv -c CookieJar.tsv \
  --data-urlencode 'query=SELECT ?s ?p ?o WHERE { ?s a <http://rdf.myexperiment.org/ontologies/base/Submission> ; ?p ?o . }' \
  --location "http://localhost:90/vendor/sparql" --write-out '%{json}' | jq '.results'
```

**NOTE**: The `--write-out '%{json}' | jq '.results'` snippet at the end allows for a nicer output, but it can be removed. You need to install `jq` first if you choose to write out the JSON output to `jq`.

The following is an example output you may see after executing the request:

```json
{
  "ordered": true,
  "distinct": false,
  "bindings": [
    {
      "s": {
        "value": "http://data.lblod.info/submissions/79cecc4f-ad73-453a-9a22-406e5a88d092",
        "type": "uri"
      },
      "p": {
        "value": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
        "type": "uri"
      },
      "o": {
        "value": "http://rdf.myexperiment.org/ontologies/base/Submission",
        "type": "uri"
      }
    }
  ]
}
```

##### Service Configuration (filter.js)

The custom authorization rules are defined in a custom [filter.js](https://github.com/lblod/app-worship-decisions-database/blob/master/config/sparql-authorization-wrapper/filter.js) file. You can write out the specific query you want executed inside the `isAuthorized()` function, and `sparql-authorization-wrapper-service` will use it when proxying requests from the vendor.

More info can found in the [writing rules](https://github.com/lblod/sparql-authorization-wrapper-service?tab=readme-ov-file#writing-rules) section of the service's README page.

#### vendor-data-distribution-service

This service works by reacting to deltas and is responsible for moving vendor-relevant data into specific graphs, where they can then be accessed through the vendor API.

##### Service Configuration (subjectsAndPaths.js)

This service is configured through a custom [subjectsAndPaths.js](https://github.com/lblod/app-worship-decisions-database/blob/master/config/vendor-data/subjectsAndPaths.js) file, similar to `sparql-authorization-wrapper-service`. More info can be found [here](https://github.com/lblod/vendor-data-distribution-service/?tab=readme-ov-file#configuration).

##### Healing Process

The healing process allows the service to "manually" copy data to vendor graphs by the following the same rules defined in `subjectsAndPaths.js`. Trigger a `POST` request to the `/healing` endpoint of the service to start the healing.
