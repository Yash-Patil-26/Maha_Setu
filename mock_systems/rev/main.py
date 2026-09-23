import os
from xml.etree.ElementTree import Element, SubElement, tostring

from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.responses import Response


app = FastAPI(
    title="SETU REV Synthetic System",
    version="0.1.0",
)


REV_API_KEY = os.getenv("REV_API_KEY", "change-me")


# Synthetic REV records
REV_RECORDS = [
    {
        "mobile": "9876543210",
        "dob": "04/03/2004",
        "income": {
            "CertNo": "MH-INC-2026-000123",
            "HolderName": "Patil Rahul Suresh",
            "AnnualIncome": "2,10,000",
            "IssueDate": "15/04/2026",
            "ValidUntil": "14/04/2027",
            "IssuingAuthority": "Tahsildar, Haveli",
        },
        "caste": {
            "CertNo": "MH-CST-2024-004417",
            "HolderName": "Patil Rahul Suresh",
            "Category": "OBC",
            "IssueDate": "02/08/2024",
            "ValidUntil": "",
        },
    }
]


@app.get("/health")
def health() -> dict[str, str]:
    return {"system": "REV", "status": "ok"}


@app.get("/certificates")
def get_certificate(
    type: str = Query(..., pattern="^(INCOME|CASTE)$"),
    mobile: str = Query(...),
    dob: str = Query(...),
    x_api_key: str | None = Header(default=None),
):
    # Check API key
    if x_api_key != REV_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")

    # Find citizen record
    record = next(
        (
            item
            for item in REV_RECORDS
            if item["mobile"] == mobile and item["dob"] == dob
        ),
        None,
    )

    # No matching record
    if record is None:
        root = Element("CertificateResponse")
        status = SubElement(root, "Status")
        status.text = "NOT_FOUND"

        return Response(
            content=tostring(root, encoding="unicode"),
            media_type="application/xml",
            status_code=404,
        )

    # Build XML response
    root = Element("CertificateResponse")
    status = SubElement(root, "Status")
    status.text = "FOUND"

    certificate = SubElement(
        root,
        "IncomeCertificate" if type == "INCOME" else "CasteCertificate",
    )

    data = record["income"] if type == "INCOME" else record["caste"]

    for key, value in data.items():
        if key == "HolderName":
            holder = SubElement(certificate, "Holder")
            name = SubElement(holder, "Name")
            name.text = value

        elif key == "AnnualIncome":
            income_details = SubElement(certificate, "IncomeDetails")
            income = SubElement(income_details, "AnnualIncome")
            income.text = value

        elif key == "Category":
            caste_details = SubElement(certificate, "CasteDetails")
            category = SubElement(caste_details, "Category")
            category.text = value

        else:
            element = SubElement(certificate, key)
            element.text = value

    return Response(
        content=tostring(root, encoding="unicode"),
        media_type="application/xml",
    )