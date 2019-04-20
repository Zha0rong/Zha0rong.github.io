
<?php
if($_REQUEST['name'] == '' || $_REQUEST['email'] == '' || $_REQUEST['url'] == '' ||  $_REQUEST['message'] == ''):
  return "error";
endif;
if (filter_var($_REQUEST['email'], FILTER_VALIDATE_EMAIL)):

  // Receiver email address
  $to = 'example@gmail.com';  //Change the email address by yours
 

      // prepare header
  $header = 'From: '. $_REQUEST['name'] . ' '. $_REQUEST['email'] .''. "\r\n";
  $header .= 'Reply-To:  '. $_REQUEST['name'] . ' '. $_REQUEST['email'] .''. "\r\n";
      // $header .= 'Cc:  ' . 'example@domain.com' . "\r\n";
      // $header .= 'Bcc:  ' . 'example@domain.com' . "\r\n";
  $header .= 'X-Mailer: PHP/' . phpversion();

      // Contact subject
  
  $subject = 'Email from VideoStories - Video Blogging HTML5 Template'; // Subject of your email

  $message .= 'Name: ' . $_REQUEST['name'] . "\n";
  $message .= 'Email: ' . $_REQUEST['email'] . "\n";
  $message .= 'Url: ' . $_REQUEST['url'] . "\n";
  $message .= 'Message: '. $_REQUEST['message'];

  // Send contact information
  $mail = mail( $to, $url, $message, $header );

  echo 'sent';
  else:
    return "error";
  endif; 

?>
