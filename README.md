# @devendor/sn-cloner

The sn-cloner module provides code to create a copy of a scoped servicenow application repository
that you can load back into servicenow under a new scoped namespace along side the original scoped
app.

It's other noteworthy trick is merging the changes back into the original parent app repository
where you can commit them and pull them back into the original application.

With some additional work, this can be part of an ICDS process for servicenow scoped application
development to address one of the fundemental challenges of running a large dev effort on servicenow.
That is, one instance can only run a single branch of an application on that instance at a time.

Basically the expense and complexity of having an instance per developer is prohibitive, so 
developers typically share a dev instance and effectively work out of the "main" branch all of
the time which is managable for small teams customizing OOB functionality, but a barrier to large
scale development efforts of custom applications on the platform.

Some examples are on [the nested sn-cloner module page](https://devendor.github.io/sn-cloner/module-sn-cloner.html)
and the primary API is in the [CloneUtil class](https://devendor.github.io/sn-cloner/module-sn-cloner.CloneUtil.html).
