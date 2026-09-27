#!/usr/bin/env python3

from __future__ import annotations

import json
import os
import sys
import time
from http.cookiejar import CookieJar
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit, quote
from urllib.request import (
    Request,
    build_opener,
    urlopen,
)

HUB_BASE_URL = os.getenv(
    "SETU_HUB_URL",
    "http://127.0.0.1:8000",
).rstrip("/")

TIMEOUT = 10
POLL_INTERVAL = 0.2
POLL_TIMEOUT = 5.0

DEMO_PASSWORD = "Demo@123"

RESULTS: list[tuple[str, bool, str]] = []


class SmokeError(RuntimeError):
    pass


def _url(path: str) -> str:
    return f"{HUB_BASE_URL}{path}"


def _request(
    method: str,
    url: str,
    *,
    token: str | None = None,
    payload: dict | None = None,
    opener=None,
) -> tuple[int, bytes]:
    data = None

    headers = {
        "Accept": "application/json",
    }

    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = Request(
        url,
        data=data,
        headers=headers,
        method=method,
    )

    client = opener or urlopen

    try:
        response = client(request, timeout=TIMEOUT)
        return response.status, response.read()
    except HTTPError as exc:
        body = exc.read()
        try:
            decoded = json.loads(body.decode("utf-8"))
        except Exception:
            decoded = body.decode("utf-8", errors="replace")

        raise SmokeError(
            f"{method} {url} -> HTTP {exc.code}: {decoded}"
        ) from exc
    except URLError as exc:
        raise SmokeError(
            f"{method} {url} -> connection error: {exc.reason}"
        ) from exc


def _json_request(
    method: str,
    path: str,
    *,
    token: str | None = None,
    payload: dict | None = None,
) -> dict | list:
    _, body = _request(
        method,
        _url(path),
        token=token,
        payload=payload,
    )

    try:
        return json.loads(body.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise SmokeError(
            f"{method} {path} returned invalid JSON"
        ) from exc


def _assert(condition: bool, message: str) -> None:
    if not condition:
        raise SmokeError(message)


def login(username: str) -> str:
    body = _json_request(
        "POST",
        "/api/auth/login",
        payload={
            "username": username,
            "password": DEMO_PASSWORD,
        },
    )

    token = body.get("access_token")
    _assert(
        isinstance(token, str) and token,
        f"Login failed for {username}",
    )

    return token


def get_application(
    token: str,
    application_id: int,
) -> dict:
    body = _json_request(
        "GET",
        f"/api/applications/{application_id}",
        token=token,
    )

    _assert(
        isinstance(body, dict),
        "Application detail response is not an object",
    )

    return body


def wait_for_application_status(
    token: str,
    application_id: int,
    expected_status: str,
) -> dict:
    deadline = time.monotonic() + POLL_TIMEOUT
    latest = get_application(token, application_id)

    while time.monotonic() < deadline:
        if latest.get("status") == expected_status:
            return latest

        time.sleep(POLL_INTERVAL)
        latest = get_application(token, application_id)

    raise SmokeError(
        f"Application {application_id} did not reach "
        f"{expected_status}; current={latest.get('status')}"
    )


def grant_scholarship_consent(token: str) -> dict:
    body = _json_request(
        "POST",
        "/api/consents",
        token=token,
        payload={
            "journey_id": "scholarship_v1",
            "purpose": "scholarship_eligibility",
        },
    )

    _assert(
        isinstance(body, dict),
        "Consent response is not an object",
    )

    return body


def create_scholarship_application(token: str) -> dict:
    body = _json_request(
        "POST",
        "/api/applications",
        token=token,
        payload={
            "journey_id": "scholarship_v1",
        },
    )

    _assert(
        isinstance(body, dict),
        "Application response is not an object",
    )

    _assert(
        isinstance(body.get("application_id"), int),
        "Application response has no application_id",
    )

    return body


def set_outage(
    admin_token: str,
    system_code: str,
    down: bool,
) -> dict:
    body = _json_request(
        "POST",
        f"/api/systems/{system_code}/simulate-outage",
        token=admin_token,
        payload={"down": down},
    )

    _assert(
        isinstance(body, dict),
        f"Outage response for {system_code} is not an object",
    )

    expected_health = "DOWN" if down else "UP"

    _assert(
        body.get("health") == expected_health,
        f"{system_code} health expected {expected_health}, "
        f"got {body.get('health')}",
    )

    return body


def retry_application(
    admin_token: str,
    application_id: int,
) -> dict:
    body = _json_request(
        "POST",
        f"/api/applications/{application_id}/retry",
        token=admin_token,
    )

    _assert(
        isinstance(body, dict),
        "Retry response is not an object",
    )

    _assert(
        body.get("application_id") == application_id,
        "Retry returned unexpected application_id",
    )

    return body


def get_access_log(
    token: str,
    consent_id: int,
) -> list[dict]:
    body = _json_request(
        "GET",
        f"/api/consents/{consent_id}/access-log",
        token=token,
    )

    _assert(
        isinstance(body, list),
        "Access log response is not a list",
    )

    return body


def sso_and_approve(
    officer_token: str,
    bss_ref: str,
) -> None:
    sso = _json_request(
        "POST",
        "/api/auth/sso-token",
        token=officer_token,
        payload={"audience": "bss"},
    )

    sso_url = sso.get("url")

    _assert(
        isinstance(sso_url, str) and sso_url,
        "SSO response did not contain a URL",
    )

    cookie_jar = CookieJar()
    opener = build_opener(
        __import__(
            "urllib.request",
            fromlist=["HTTPCookieProcessor"],
        ).HTTPCookieProcessor(cookie_jar)
    )

    try:
        sso_request = Request(
            sso_url,
            headers={"Accept": "text/html"},
            method="GET",
        )
        with opener.open(
            sso_request,
            timeout=TIMEOUT,
        ) as response:
            response.read()
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise SmokeError(
            f"BSS SSO GET failed: HTTP {exc.code}: {body}"
        ) from exc
    except URLError as exc:
        raise SmokeError(
            f"BSS SSO GET failed: {exc.reason}"
        ) from exc

    parts = urlsplit(sso_url)

    bss_base = f"{parts.scheme}://{parts.netloc}"

    decision_url = (
        f"{bss_base}/officer/applications/"
        f"{quote(bss_ref, safe='')}/decision"
    )

    form_body = urlencode(
        {
            "decision": "APPROVED",
            "remarks": "T-100 smoke test approval",
        }
    ).encode("utf-8")

    request = Request(
        decision_url,
        data=form_body,
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
        },
        method="POST",
    )

    try:
        with opener.open(
            request,
            timeout=TIMEOUT,
        ) as response:
            status = response.status
            response.read()
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise SmokeError(
            f"BSS approval failed: HTTP {exc.code}: {body}"
        ) from exc
    except URLError as exc:
        raise SmokeError(
            f"BSS approval failed: {exc.reason}"
        ) from exc

    _assert(
        status == 200,
        f"BSS approval returned unexpected status {status}",
    )


def scenario_s1(
    rahul_token: str,
) -> dict:
    grant_scholarship_consent(rahul_token)

    created = create_scholarship_application(rahul_token)

    application_id = created["application_id"]

    detail = get_application(
        rahul_token,
        application_id,
    )

    _assert(
        detail.get("status") == "SUBMITTED",
        f"S1 expected SUBMITTED, got {detail.get('status')}",
    )

    _assert(
        detail.get("outcome") == "ELIGIBLE",
        f"S1 expected ELIGIBLE, got {detail.get('outcome')}",
    )

    _assert(
        isinstance(detail.get("canonical"), dict),
        "S1 canonical data missing",
    )

    _assert(
        isinstance(detail.get("provenance"), dict),
        "S1 provenance missing",
    )

    external_refs = detail.get("external_refs") or {}

    _assert(
        external_refs.get("BSS"),
        "S1 BSS external reference missing",
    )

    steps = detail.get("steps") or []

    statuses = {
        step.get("step_id"): step.get("status")
        for step in steps
    }

    for step_id in (
        "fetch_income",
        "fetch_enrolment",
        "evaluate_eligibility",
        "submit_bss",
    ):
        _assert(
            statuses.get(step_id) == "DONE",
            f"S1 step {step_id} not DONE",
        )

    return detail


def scenario_s2(
    rahul_token: str,
    officer_token: str,
    s1_detail: dict,
) -> None:
    bss_ref = (s1_detail.get("external_refs") or {}).get("BSS")

    _assert(
        isinstance(bss_ref, str) and bss_ref,
        "S2 has no BSS reference from S1",
    )

    sso_and_approve(
        officer_token,
        bss_ref,
    )

    application_id = int(s1_detail["id"])

    deadline = time.monotonic() + POLL_TIMEOUT
    latest = get_application(
        rahul_token,
        application_id,
    )

    while time.monotonic() < deadline:
        if latest.get("status") == "APPROVED":
            break

        time.sleep(POLL_INTERVAL)
        latest = get_application(
            rahul_token,
            application_id,
        )

    _assert(
        latest.get("status") == "APPROVED",
        f"S2 expected APPROVED, got {latest.get('status')}",
    )

    _assert(
        latest.get("outcome") == "APPROVED",
        f"S2 expected APPROVED outcome, got {latest.get('outcome')}",
    )

    metrics = latest.get("metrics") or {}

    _assert(
        metrics.get("last_webhook", {}).get("decision") == "APPROVED",
        "S2 webhook decision was not recorded as APPROVED",
    )


def scenario_s3(
    rahul_token: str,
    admin_token: str,
) -> None:
    set_outage(
        admin_token,
        "REV",
        True,
    )

    try:
        grant_scholarship_consent(rahul_token)

        created = create_scholarship_application(
            rahul_token,
        )

        application_id = created["application_id"]

        detail = get_application(
            rahul_token,
            application_id,
        )

        _assert(
            detail.get("status") == "PAUSED_EXCEPTION",
            f"S3 expected PAUSED_EXCEPTION, "
            f"got {detail.get('status')}",
        )

        _assert(
            detail.get("current_step") == "fetch_income",
            f"S3 expected fetch_income, "
            f"got {detail.get('current_step')}",
        )

        failed = next(
            (
                step
                for step in detail.get("steps", [])
                if step.get("step_id") == "fetch_income"
            ),
            None,
        )

        _assert(
            failed is not None,
            "S3 fetch_income step missing",
        )

        _assert(
            failed.get("status") == "FAILED",
            f"S3 fetch_income expected FAILED, "
            f"got {failed.get('status')}",
        )

        _assert(
            failed.get("error_code") == "CONNECTOR_ERROR",
            f"S3 expected CONNECTOR_ERROR, "
            f"got {failed.get('error_code')}",
        )

        set_outage(
            admin_token,
            "REV",
            False,
        )

        retry_application(
            admin_token,
            application_id,
        )

        final = get_application(
            rahul_token,
            application_id,
        )

        _assert(
            final.get("status") == "SUBMITTED",
            f"S3 expected SUBMITTED after retry, "
            f"got {final.get('status')}",
        )

        _assert(
            final.get("outcome") == "ELIGIBLE",
            f"S3 expected ELIGIBLE after retry, "
            f"got {final.get('outcome')}",
        )

        retried_step = next(
            (
                step
                for step in final.get("steps", [])
                if step.get("step_id") == "fetch_income"
            ),
            None,
        )

        _assert(
            retried_step is not None,
            "S3 fetch_income step missing after retry",
        )

        _assert(
            retried_step.get("status") == "DONE",
            "S3 fetch_income did not finish after retry",
        )

        _assert(
            retried_step.get("attempts") == 2,
            f"S3 expected 2 attempts, "
            f"got {retried_step.get('attempts')}",
        )

    finally:
        set_outage(
            admin_token,
            "REV",
            False,
        )


def scenario_s4(
    suresh_token: str,
    officer_token: str,
    admin_token: str,
) -> None:
    consent = grant_scholarship_consent(
        suresh_token,
    )

    consent_id = int(consent["id"])

    set_outage(
        admin_token,
        "EDU",
        True,
    )

    try:
        created = create_scholarship_application(
            suresh_token,
        )

        application_id = created["application_id"]

        paused = get_application(
            suresh_token,
            application_id,
        )

        _assert(
            paused.get("status") == "PAUSED_EXCEPTION",
            f"S4 setup expected PAUSED_EXCEPTION, "
            f"got {paused.get('status')}",
        )

        _assert(
            paused.get("current_step") == "fetch_enrolment",
            f"S4 setup expected fetch_enrolment, "
            f"got {paused.get('current_step')}",
        )

        after_first_fetch = get_access_log(
            suresh_token,
            consent_id,
        )

        application_logs = [
            row
            for row in after_first_fetch
            if row.get("application_id") == application_id
        ]

        _assert(
            application_logs,
            "S4 did not create an access-log entry for this application",
        )

        _assert(
            application_logs[-1].get("outcome") == "ALLOWED",
            "S4 first successful fetch was not logged as ALLOWED",
        )

        _assert(
            application_logs[-1].get("system_code") == "REV",
            "S4 first access-log entry was not from REV",
        )

        revoked = _json_request(
            "POST",
            f"/api/consents/{consent_id}/revoke",
            token=suresh_token,
        )

        _assert(
            revoked.get("status") == "REVOKED",
            "S4 consent was not revoked",
        )

        set_outage(
            admin_token,
            "EDU",
            False,
        )

        retry_application(
            officer_token,
            application_id,
        )

        blocked = get_application(
            suresh_token,
            application_id,
        )

        _assert(
            blocked.get("status") == "BLOCKED_CONSENT",
            f"S4 expected BLOCKED_CONSENT, "
            f"got {blocked.get('status')}",
        )

        after_denial = get_access_log(
            suresh_token,
            consent_id,
        )

        denied_logs = [
            row
            for row in after_denial
            if row.get("application_id") == application_id
        ]

        _assert(
            len(denied_logs) >= 2,
            "S4 expected both ALLOWED and DENIED access-log entries",
        )

        _assert(
            any(
                row.get("outcome") == "DENIED"
                and row.get("system_code") == "EDU"
                for row in denied_logs
            ),
            "S4 revoked fetch was not logged as DENIED by EDU",
        )

        new_consent = grant_scholarship_consent(
            suresh_token,
        )

        _assert(
            new_consent.get("status") == "ACTIVE",
            "S4 re-grant did not create/return ACTIVE consent",
        )

        retry_application(
            officer_token,
            application_id,
        )

        recovered = get_application(
            suresh_token,
            application_id,
        )

        _assert(
            recovered.get("status") == "SUBMITTED",
            f"S4 expected SUBMITTED after re-grant, "
            f"got {recovered.get('status')}",
        )

        _assert(
            recovered.get("outcome") == "ELIGIBLE",
            f"S4 expected ELIGIBLE after re-grant, "
            f"got {recovered.get('outcome')}",
        )

        _assert(
            (recovered.get("external_refs") or {}).get("BSS"),
            "S4 recovery did not produce BSS reference",
        )

        new_consent_logs = get_access_log(
            suresh_token,
            int(new_consent["id"]),
        )

        _assert(
            any(
                row.get("application_id") == application_id
                and row.get("outcome") == "ALLOWED"
            for row in new_consent_logs
            ),
            "S4 re-granted consent did not allow a fetch",
        )

    finally:
        set_outage(
            admin_token,
            "EDU",
            False,
        )

def run_scenario(
    name: str,
    function,
) -> object | None:
    try:
        value = function()
        RESULTS.append((name, True, "PASS"))
        print(f"{name:<28} PASS")
        return value
    except Exception as exc:
        RESULTS.append((name, False, str(exc)))
        print(f"{name:<28} FAIL")
        print(f"  {exc}")
        return None


def main() -> int:
    print("SETU T-100 API smoke test")
    print(f"HUB: {HUB_BASE_URL}")
    print()

    try:
        admin_token = login("admin1")
        rahul_token = login("rahul.patil")
        suresh_token = login("suresh.pawar")
        officer_token = login("officer1")
    except Exception as exc:
        print("BOOTSTRAP                    FAIL")
        print(f"  {exc}")
        return 1

    # Ensure a previous failed run did not leave REV/EDU down.
    try:
        set_outage(admin_token, "REV", False)
        set_outage(admin_token, "EDU", False)
    except Exception as exc:
        print("ENVIRONMENT                  FAIL")
        print(f"  {exc}")
        return 1

    print("S1 Happy path                 ", end="")
    try:
        s1_detail = scenario_s1(rahul_token)
        RESULTS.append(("S1 Happy path", True, "PASS"))
        print("PASS")
    except Exception as exc:
        s1_detail = None
        RESULTS.append(("S1 Happy path", False, str(exc)))
        print("FAIL")
        print(f"  {exc}")

    print("S2 SSO + event loop           ", end="")
    try:
        if s1_detail is None:
            raise SmokeError("depends on S1")
        scenario_s2(
            rahul_token,
            officer_token,
            s1_detail,
        )
        RESULTS.append(("S2 SSO + event loop", True, "PASS"))
        print("PASS")
    except Exception as exc:
        RESULTS.append(("S2 SSO + event loop", False, str(exc)))
        print("FAIL")
        print(f"  {exc}")

    print("S3 Outage recovery            ", end="")
    try:
        scenario_s3(
            rahul_token,
            admin_token,
        )
        RESULTS.append(("S3 Outage recovery", True, "PASS"))
        print("PASS")
    except Exception as exc:
        RESULTS.append(("S3 Outage recovery", False, str(exc)))
        print("FAIL")
        print(f"  {exc}")

    print("S4 Consent revoke             ", end="")
    try:
        scenario_s4(
            suresh_token,
            officer_token,
            admin_token,
        )
        RESULTS.append(("S4 Consent revoke", True, "PASS"))
        print("PASS")
    except Exception as exc:
        RESULTS.append(("S4 Consent revoke", False, str(exc)))
        print("FAIL")
        print(f"  {exc}")

    print()

    passed = sum(
        1
        for _, ok, _ in RESULTS
        if ok
    )

    total = len(RESULTS)

    print(f"RESULT: {passed}/{total} PASS")

    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())
