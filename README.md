# RPMDT
A nodejs Computer Assisted Dispatch application made for roleplay

## Require support?

Join [this discord server](https://discord.gg/cm5BMje) for support.

## Setup
Rename config.example.json to config.json and fill in the fields.

`web.port` - The port where you want the MDT to run on

`web.secret` - A series of random letters and numbers to scramble some things

`web.registrationApproval` - Require approval from admins

`web.allowRegistration` - Unused as of 12/24/17

`authentication.name` - The name of the authenticator you wish to use. By default, it is set to discord

`authentication.loginURL` - URL that should redirect to an oauth page

`authentication.loginCallback` - The callback URL for oauth

`discord.client_id` - Client ID of your application

`discord.secret` - The secret of your application

`discord.token` - Discord bot token for making user search possible

`discord.mustBeInServer` - Server ID that a user must be in if restrictToServer is true

`discord.restrictToServer` - Require users to be in a specific server

`mysql.*` - MYSQL connection information
