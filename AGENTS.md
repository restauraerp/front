## Guideline
* When trying to run a Laravel `artisan` command do it inside the docker container like this: `docker exec restoraerp_core_api php artisan <rest of the command>`
* To check recent logs for the `front` container run the following command: `docker logs restoraerp_front`

## Automated Test Coverage Guardrail (>= 85%)
* **Mandatory Requirement:** All new tasks, features, and bug fixes MUST achieve at least **85% automated test coverage** on new/edited code.
* A task is NOT considered done until automated tests covering the modified functionality are passing and meet or exceed the 85% threshold.