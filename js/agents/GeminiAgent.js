class GeminiAgent extends Agent {

	constructor( apiKey ) {

		super( {
			apiKey: apiKey,
			responseType: 'GEMINI_RESPONSE',
			callType: 'CALL_GEMINI',
			timeout: 30000
		} );

	}

}
