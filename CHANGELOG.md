# Changelog
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
