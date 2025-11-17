class GeminiAgent {

	constructor( apiKey ) {

		this.apiKey = apiKey;
		this.backgroundPort = null;
		this.isPortConnected = false;
		this.timeout = 30000;

	}

	setBackgroundPort( port ) {

		this.backgroundPort = port;
		this.isPortConnected = true;

	}

	setPortConnected( connected ) {

		this.isPortConnected = connected;

	}

	async sendMessage( systemPrompt, messages ) {

		if ( !this.backgroundPort || !this.isPortConnected ) {

			throw new Error( 'Not connected to background script' );

		}

		return new Promise( ( resolve, reject ) => {

			const responseHandler = ( message ) => {

				if ( message.type === 'GEMINI_RESPONSE' ) {

					this.backgroundPort.onMessage.removeListener( responseHandler );
					this.backgroundPort.onMessage.removeListener( errorHandler );
					resolve( message.response );

				}

			};

			const errorHandler = ( message ) => {

				if ( message.type === 'ERROR' ) {

					this.backgroundPort.onMessage.removeListener( responseHandler );
					this.backgroundPort.onMessage.removeListener( errorHandler );
					reject( new Error( message.error ) );

				}

			};

			this.backgroundPort.onMessage.addListener( responseHandler );
			this.backgroundPort.onMessage.addListener( errorHandler );

			try {

				this.backgroundPort.postMessage( {
					type: 'CALL_GEMINI',
					apiKey: this.apiKey,
					systemPrompt: systemPrompt,
					messages: messages
				} );

			} catch ( error ) {

				this.backgroundPort.onMessage.removeListener( responseHandler );
				this.backgroundPort.onMessage.removeListener( errorHandler );
				this.isPortConnected = false;

				if ( error.message.includes( 'disconnected port' ) ) {

					reject( new Error( 'Connection lost. Please try again.' ) );

				} else {

					reject( new Error( 'Failed to send message: ' + error.message ) );

				}

			}

			setTimeout( () => {

				this.backgroundPort.onMessage.removeListener( responseHandler );
				this.backgroundPort.onMessage.removeListener( errorHandler );
				reject( new Error( 'Request timeout' ) );

			}, this.timeout );

		} );

	}

}
