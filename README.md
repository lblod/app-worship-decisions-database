# Public Decision Database

Backend API providing exposing the public decision data. 
Started from the [mu-project](https://github.com/mu-semtech/mu-project) template.

## Running and maintaining

General information on running, maintaining and installing the stack.

### How to setup the stack

> **Prerequisites**: you have [docker](https://docs.docker.com/get-docker/), [docker-compose](https://docs.docker.com/get-docker/) and [git-lfs](https://github.com/git-lfs/git-lfs/wiki/Installation) installed on your system 
> and [cloned the repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository) to your system.

#### Running the dev. setup

Move in to the directory
```shell
cd app-public-decision-database
```
Start the system:
 ```shell
 docker-compose up
 ```
 > docker-compose **up** CLI reference can be found [here](https://docs.docker.com/compose/reference/up/).

Wait for everything to boot to ensure clean caches.  
You may choose to monitor the migrations service in a separate terminal to and wait for the overview of all migrations to appear: 

```shell
docker-compose logs -f --tail=100 migrations.
```
> docker-compose **logs** CLI reference can be found [here](https://docs.docker.com/compose/reference/logs/).