import { querySudo } from '@lblod/mu-auth-sudo';

export async function getConflictingPersons() {
  const queryString = `
    PREFIX adms: <http://www.w3.org/ns/adms#>
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX person: <http://www.w3.org/ns/person#>

    SELECT ?person ?match
    WHERE {
      GRAPH ?g {
        ?person a person:Person .
        ?person adms:identifier / skos:notation ?rrn .
      } 
      ?g ext:ownedBy ?organization .

      GRAPH ?g2 {
        ?match a person:Person .
        ?match adms:identifier / skos:notation ?rrn .
      } 
      ?g2 ext:ownedBy ?organization2 .

      FILTER(?person < ?match)
    } 
  `;
  const queryResult = await querySudo(queryString);
  const bindings = queryResult.results?.bindings;

  if (!bindings || bindings.length === 0) {
    return null;
  }

  return bindings.map((b) => {
    return {
      personUri: b.person.value,
      personMatchUri: b.match.value,
    };
  });
}
