class Agent {

	constructor( config ) {

		this.apiKey = config.apiKey;
		this.responseType = config.responseType;
		this.callType = config.callType;
		this.timeout = config.timeout || 30000;
		this.backgroundPort = null;
		this.isPortConnected = false;

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

				if ( message.type === this.responseType ) {

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

				const messageData = {
					type: this.callType,
					systemPrompt: systemPrompt,
					messages: messages
				};

				// Only add apiKey if it exists (LocalAgent doesn't need it)
				if ( this.apiKey !== undefined ) {
					messageData.apiKey = this.apiKey;
				}

				this.backgroundPort.postMessage( messageData );

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
