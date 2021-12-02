# Public Decision Database

Backend API providing exposing the public decision data.
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
cd app-public-decision-database
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