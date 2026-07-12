# Changelog

All notable SupplyDesk changes are documented here.

## [1.4.26]

### Added

- Added the Suppliers module to the main navigation with supplier creation, read-only cards, explicit edit mode, and supplier deletion.
- Added Mail Relay settings in Admin Settings, including email notification enablement, recipient configuration, test-email endpoint, and selectable email themes.
- Added HTML RTL email notification templates for new purchase requests.

### Changed

- Completed bilingual Arabic/English wording for the new supplier and Mail Relay interfaces with formal labels and helper text.
- Added success and warning notices for admin setting saves, supplier deletion, and email notification status.

## [1.4.25]

### Changed

- Simplified the request details panel to use one `Save Changes` action for both request fields and manual notes.
- Saving from request details now closes the panel and returns the user to the dashboard.

## [1.4.24]

### Changed

- Updated the README and GitHub Pages dashboard screenshots to use clearer demo data.
- The public dashboard screenshot now shows a 2026 annual budget of 15,000,000 QAR, consumed balance, and remaining balance so users understand how requests deduct from the yearly budget.

## [1.4.23]

### Changed

- Renamed the published-image production compose file to `docker-compose.yml`.
- Renamed the source-build compose file to `docker-compose.dev.yml`.
- Simplified the README and moved detailed installation guidance to the GitHub Pages landing page.
- Updated documentation and quick-start commands to use the new compose file convention.

### Removed

- Removed `docker-compose.image.yml`; production now uses `docker-compose.yml`.

## [1.4.22]

### Added

- Added a prominent live GitHub Pages link near the top of the README so the public landing page is visible directly from the repository.

## [1.4.21]

### Changed

- Removed the failing GitHub Pages Actions workflow after switching the live landing page to the `gh-pages` branch deployment.
- Kept Docker image publishing and GitHub release automation active.

## [1.4.20]

### Added

- Added a `.nojekyll` marker to the GitHub Pages site output source.

### Changed

- Retriggered the GitHub Pages deployment after Pages was enabled in repository settings.

## [1.4.19]

### Changed

- Updated the GitHub Pages workflow to enable Pages automatically when the repository is not configured yet.

## [1.4.18]

### Added

- Added a GitHub Pages landing page for SupplyDesk with the existing product screenshots.
- Added a GitHub Actions workflow to build and publish the Docker image to GitHub Container Registry.
- Added a GitHub Actions workflow to deploy the landing page with GitHub Pages.
- Added a GitHub Actions workflow to create releases from version tags.
- Added `docker-compose.image.yml` for running the published image without building locally.
- Added quick-start documentation for the published Docker image.

### Changed

- Updated the application version to `1.4.18`.
- Updated README installation guidance to show the published Docker image as the fastest path.

## [1.4.17]

### Added

- Completed the SupplyDesk repository presentation with English screenshots and Docker Compose installation documentation.
- Added source-build Docker support with PostgreSQL 18.

### Changed

- Updated default demo data to neutral English records for new installs.
- Set new installs to open in English by default while keeping the Arabic UI available from the language switcher.
