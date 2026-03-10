<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'goto' => [
        'client_id' => env('GOTO_CLIENT_ID'),
        'client_secret' => env('GOTO_CLIENT_SECRET'),
        'redirect_uri' => env('GOTO_REDIRECT_URI', 'http://localhost:8000/goto/callback'),
        'auth_url' => 'https://authentication.logmeininc.com',
        'api_url' => 'https://api.goto.com',
        'access_token' => env('GOTO_ACCESS_TOKEN'),
        'refresh_token' => env('GOTO_REFRESH_TOKEN'),
        'account_key' => env('GOTO_ACCOUNT_KEY'),
    ],

];
