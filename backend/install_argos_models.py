from argostranslate import package

def main():
    available_packages = package.get_available_packages()

    # Try direct English -> Swahili first
    target = next(
        (
            p for p in available_packages
            if p.from_code == "en" and p.to_code == "sw"
        ),
        None
    )

    if target is None:
        raise Exception("No en->sw Argos model found in available packages")

    download_path = target.download()
    package.install_from_path(download_path)
    print("Installed Argos model:", target.from_code, "->", target.to_code)

if __name__ == "__main__":
    main()