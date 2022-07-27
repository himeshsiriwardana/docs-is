
OAuth `nonce` and `timestamp` together play an important role when it comes to OAuth security depending on how they are implemented in an application. These two help OAuth to be protected from what is called a replay-attack - an attack where the same request is resent, maybe over and over again.

The term `nonce` means ‘number used once’. It should be a unique and random string that is meant to uniquely identify each signed request. This string value is used to associate a client session with an ID Token, and to mitigate replay attacks. In OAuth, the `nonce` value should be sent by the client during implicit flow. Then the value is then passed unmodified from the Authentication Request to the ID token.

By having a unique identifier for each request, the service provider is able to prevent requests from being used more than once. When implementing this, the consumer/client generates a unique string for each request sent to the Service Provider. The service provider keeps track of all the nonces used to prevent them from being used a second time. Since the nonce value is included in the signature, it cannot be changed by an attacker without knowing the shared secret.

It becomes a problem when Service Provider keeps a persistent storage of all `nonce` values received. To make this practical, timestamp comes to play. OAuth adds a timestamp value to each request which allows the Service Provider to keep `nonce` values only for a limited time. When a request comes in with a `timestamp` that is older than the retained time frame, it is rejected as the Service Provider no longer has nonces from that time period. It is safe to assume that a request sent after the allowed time limit is a replay attack. The `nonce` together with `timestamp`, provides a perpetual unique value that can never be used again by an attacker.
    