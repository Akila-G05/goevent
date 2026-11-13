import io
import json
from pathlib import Path
import sys
import tarfile
import tempfile
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'deploy'))
from bundle import pack, inspect


class BundleTests(unittest.TestCase):
    def test_inert_bundle_roundtrip_and_disabled_operator_policy(self):
        with tempfile.TemporaryDirectory() as directory:
            archive = Path(directory)/'bundle.tar'
            pack(archive)
            files = inspect(archive)
            self.assertFalse(json.loads(files['deploy/operator-policy.example.json'])['enabled'])
            self.assertIn('compose/dependencies.yml', files)
            self.assertIn('config/backend/application.properties', files)
            self.assertFalse(any(name.startswith(('backend/', 'frontend/', 'gateway/')) for name in files))
            with self.assertRaises(FileExistsError): pack(archive)

    def test_archive_path_escape_and_symlink_are_rejected(self):
        for name, kind in [('../escape', tarfile.REGTYPE), ('deploy/link', tarfile.SYMTYPE)]:
            with tempfile.TemporaryDirectory() as directory:
                archive = Path(directory)/'bundle.tar'
                with tarfile.open(archive, 'w') as target:
                    entry = tarfile.TarInfo(name); entry.type = kind
                    entry.size = 1 if kind == tarfile.REGTYPE else 0
                    target.addfile(entry, io.BytesIO(b'x'))
                with self.assertRaises(ValueError): inspect(archive)
