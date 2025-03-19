# Merge Person Service

This service includes a cronjob that will fetch all conflicting persons and merge the data if possible. When there is a data mismatch for the person a flag will be added to the data so we can recognize them in the data.

## Context

Sometimes a new uri is generated for a person with an identifier (`adms:identifier / skos:notation`) that already exists. Most of the time this is a person in another graph. The solution for this is to merge that data. When for a person with an identifier is found another person uri but with the same identifier this person is a conflict. A `astreams:Tombstone` will be created for this conflict and all usages are replaced with the person uri.

When all persons are merged there only exists one person uri for each unique identifier.

Of course we have a second scenario where the data of the person e.g. the _firstName_ is not the same in the conflicting person. If so we add a triple to that person `ext:conflictsWith` that can be used to find all the person that need manual attention.

## Adding it to your project

```yml
services:
  merge-person-cron:
    image: lblod/merge-person-service:latest
    restart: always
    environment:
      CRON_TIME: '0 8 * * 1-5'; // Every weekday at 8am # The default value
      CRON_LOG_LEVEL: info or debug # Info logs are always shown, debug can be set here if you need more detail of whats going on
      PROCESS_BATCH_SIZE:  5 # The default value
```
