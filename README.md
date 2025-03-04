# Person Service

This service will help you manage creating your person instances.

## Types

|Ontology|Class|uri|
|-|-|-|
|<http://www.w3.org/ns/person#>|**person:Person**|<http://www.w3.org/ns/person#Person>|

## Endpoints

### Create person

Endpoint: `/person`

The _identifier_ is our main parameter here. Depending if a person is found it will return you a message that it already exists or that the parameters you gave it next to the _identifier_ do not match with what was found in the database.

It could be that the _identifier_ is not found in the graph that the user has access to. Then we are checking in other graphs so we could copy it over, if found. This will prevent creating a new person uri for a person that actually already exists.

When the person was not found over the entire database a new person is created. This person will get a new _identifier_ & _geboorte_ subject.

### Get person by identifier

Endpoint: `/person/:identifier/identifier`

If the _identifier_ is know the person uri can be fetched if this already exists in the database where the session has access to.

## Adding it to your project

This can easily be done by adding it as a service in your _docker-compose.yml_

```yml
services:
  person:
    image: lblod/person-service:latest
    labels:
      - "logging=true"
    restart: always
```
