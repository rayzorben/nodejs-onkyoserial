# Onkyo ISCP (Serial Communication Protocol) #

**nodejs-onkyoserial** uses the RS232 protocol to communicate with Onkyo Receivers.

It handles the communication and abstracts it away into a REST API:

URL	| Description
--- | -----------
/status	| Queries the status of the system and returns the current state
/master/power	| Returns the current status
/master/power/on,off	| Turns the receiver On or Standby
/master/volume	| Returns the current status
/master/volume/0-100	| Sets the volume and returns status
/master/input	| Returns the current status
/master/input/[source]	| Sets the input (see sources.json - any one of the values may be used such as VIDEO3 or AUX)

Replace /master with /zone2 in order to control ZONE2 ( e.g., /zone2/volume/65 )

Information for this protocol was gathered from https://github.com/schultzy51/scratch/tree/master/onkyo
