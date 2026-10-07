"""Publish public/ to Amplify and verify this exact commit over HTTPS."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
import zipfile


def aws(*args):
    result = subprocess.run(
        ["aws", "amplify", *args, "--region", os.environ["AWS_REGION"],
         "--output", "json", "--no-cli-pager"],
        check=True, capture_output=True, text=True,
    )
    return json.loads(result.stdout)


def main():
    app = os.environ["AMPLIFY_APP_ID"]
    commit = os.environ["GITHUB_SHA"]
    branch = "main"
    common = ["--app-id", app, "--branch-name", branch]
    source = Path("public")
    html = (source / "index.html").read_text(encoding="utf-8")
    files = sorted(source.rglob("*"))
    for path in files:
        if path.is_symlink() or path.name.startswith(".") or path.suffix in {".pem", ".key"}:
            raise RuntimeError(f"Refusing to publish unexpected file: {path}")
    with tempfile.TemporaryDirectory() as temporary:
        archive_path = Path(temporary) / "site.zip"
        with zipfile.ZipFile(archive_path, "w", zipfile.ZIP_DEFLATED) as archive:
            for path in files:
                if path.is_file():
                    archive.write(path, path.relative_to(source).as_posix())
            archive.writestr("deployment.json", json.dumps({"commit": commit, "branch": branch}))
        deployment = aws("create-deployment", *common)
        upload_url = deployment["zipUploadUrl"]
        print(f"::add-mask::{upload_url}")
        request = urllib.request.Request(upload_url, data=archive_path.read_bytes(), method="PUT",
                                         headers={"Content-Type": "application/zip"})
        with urllib.request.urlopen(request, timeout=90) as response:
            if response.status not in (200, 201):
                raise RuntimeError("Artifact upload failed")
        job = deployment["jobId"]
        aws("start-deployment", *common, "--job-id", job)
        for _ in range(60):
            status = aws("get-job", *common, "--job-id", job)["job"]["summary"]["status"]
            print(f"Amplify job {job}: {status}", flush=True)
            if status == "SUCCEED":
                break
            if status in {"FAILED", "CANCELLED"}:
                raise RuntimeError(f"Amplify deployment ended with {status}")
            time.sleep(10)
        else:
            raise TimeoutError("Amplify deployment did not finish in ten minutes")
        domain = aws("get-app", "--app-id", app)["app"]["defaultDomain"]
        url = f"https://{branch}.{domain}"
        for attempt in range(30):
            try:
                with urllib.request.urlopen(f"{url}/deployment.json?commit={commit}", timeout=20) as response:
                    published = json.load(response)
                with urllib.request.urlopen(f"{url}/?commit={commit}", timeout=20) as response:
                    published_html = response.read().decode("utf-8")
                if published.get("commit") == commit and published_html == html:
                    break
            except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
                pass
            time.sleep(5)
        else:
            raise RuntimeError("The site did not serve the expected commit and HTML")
        summary = (f"## Deployment verified\n\n- Website: {url}\n"
                   f"- Commit: `{commit}`\n- Branch: `{branch}`\n- Amplify job: `{job}`\n"
                   "- Trigger: push to main\n- Verification: published HTML matches repository\n")
        print(summary)
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as output:
            output.write(summary)


if __name__ == "__main__":
    main()
