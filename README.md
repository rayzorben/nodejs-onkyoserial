Onkyo ISCP (Serial Communication Protocol)

nodejs-onkyoserial uses the RS232 protocol to communicate with Onkyo Receivers.

It handles the communication and abstracts it away into a REST API:

/status Queries the status of the system and returns the current state
/master/power Returns the current status
/master/power/on|off Turns the receiver On or Standby
/master/volume Returns the current status
/master/volume/0-100 Sets the volume and returns status
/master/input Returns the current status
/master/input/[source] Sets the input (see sources.json - any one of the values may be used such as VIDEO3 or AUX)

Replace /master with /zone2 To control ZONE2
