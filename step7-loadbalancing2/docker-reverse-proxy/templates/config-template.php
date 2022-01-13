<?php
    $static_app = getenv('STATIC_APP');
    $dynamic_app = getenv('DYNAMIC_APP');
?>

<VirtualHost *:80>
    ServerName infra.lab

    ProxyPass '/api/json/' 'http://<?php print "$dynamic_app"?>/'
    ProxyPassReverse "/api/json/" "http://<?php print "$dynamic_app"?>/'


    ProxyPass '/' 'http://<?php print "$static_app"?>/'
    ProxyPassReverse '/ '<?php print "$static_app"?>/'

</VirtualHost>
