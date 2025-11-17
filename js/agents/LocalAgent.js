class LocalAgent extends Agent {

	constructor() {

		super( {
			responseType: 'LOCAL_RESPONSE',
			callType: 'CALL_LOCAL',
			timeout: 60000
		} );

	}

}
