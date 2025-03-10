# merge Person Service

This service will help you manage creating/merging your person instances.

## Types

|Ontology|Class|uri|
|-|-|-|
|<http://www.w3.org/ns/person#>|**person:Person**|<http://www.w3.org/ns/person#Person>|

## Endpoints

### Merge person

Endpoint: `/person`

The _identifier_ is our main parameter here. When a person is found for the given parameters or the person the given data is merged for this person.

It could be that the _identifier_ is not found in the graph that the user has access to. Then we are checking in other graphs so we could copy it over, if found. This will prevent creating a new person uri for a person that actually already exists.

When the person was not found over the entire database a new person is created. This person will get a new _identifier_ & _geboorte_ subject.

## Rate Limit

We added a simple rate limit in the POST person endpoint. This to prevent brute forcing person information. This limit can be set by adding `RATE_LIMIT` and `RATE_LIMIT_TIME_SPAN` to your service environments. The default values for these are `0` so please add them to your service.

## Adding it to your project

This can easily be done by adding it as a service in your _docker-compose.yml_

```yml
services:
  merge-person:
    image: lblod/merge-person-service:latest
    labels:
      - "logging=true"
    restart: always
    environment:
      RATE_LIMIT: 1000
      RATE_LIMIT_TIME_SPAN: 30000
```
