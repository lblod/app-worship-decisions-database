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

You might find the above `docker-compose up` command tedious. To simplify it's usage we can define the `COMPOSE_FILE` variable in our environment.

Create an `.env` file in the root of the project with the following contence:
```shell
COMPOSE_FILE=docker-compose.yml:docker-compose.dev.yml
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
  - Ensure all migrations have run and the stack is running properly.
  - In `docker-compose.override.yml` add
    ```
      op-public-consumer:
        environment:
          DCR_SYNC_BASE_URL: "https://organisaties.abb.vlaanderen.be"
          DCR_DISABLE_INITIAL_SYNC: "false"
      update-bestuurseenheid-mock-login:
        entrypoint: ["echo", "Service-disabled to not confuse the service"]
    ```
    - `docker-compose up -d # assumes .env file has been set, cf. supra`
    - This might take a while if `drc logs op-public-consumer |grep success`
      Returns: `Initial sync http://redpencil.data.gift/id/job/URI has been successfully run`; you should be good.
      (Your computer will also stop making noise)
    - In `docker-compose.override.yml`, remove the disabled service
       ```
        update-bestuurseenheid-mock-login:
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
### login (all environments)
For now, we use specic logins for the dashboard users. Each environement has its own passwords.
To add a user, make sure to have installed [mu-cli](https://github.com/mu-semtech/mu-cli) first.
Then in `docker-compose.override.yml`
```
  dashboard-login
    environment:
      MU_APPLICATION_SALT: 'a_random_string_with_sufficient_entropy_hence_not_this_one'
```
You can generate by running `mu script project-scripts generate-dashboard-login` and following the steps.
Restart `migrations` and it should work.
Note: on DEV and QA, the passwords will be kept in on the server in `docker-compose.override.yml`

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
