# Summary

Creating a video from multiple other videos requires some fairly complicated urls so here are some useful tips.

The last part of the url (the target video) will be the first video that plays in the sequence, and then all of the _fl_splice_ sections will play in order of appearance in the url.

Each spliced clip will take the form of:
```/fl_splice,l_video:<public id>/<any transforms of the clip>/fl_layer_apply/
```

_fl_splice_ causes the clip to be spliced in (concatenated), instead of overlayed.

_l_video_ and _/fl_layer_apply/_ are start and end tags, wrapping up any transforms that need to be applied to the clip.
<br>
# Detailed Information
Guide: [Video Transformations](https://cloudinary.com/documentation/video_manipulation_and_delivery) 
 - [Concatenating Videos](https://cloudinary.com/documentation/video_manipulation_and_delivery#concatenating_videos) 

Reference: [Transform URL API](https://cloudinary.com/documentation/transformation_reference)
 - [_fl_splice_](https://cloudinary.com/documentation/transformation_reference#fl_splice)
 - [_l_video_]()
 - [_/fl_layer_apply/_](https://cloudinary.com/documentation/transformation_reference#fl_layer_apply)

<br>
# Resources
## Training
 [Cloudinary Academy](https://training.cloudinary.com/) (it's free, comprehensive and self-paced)

## Full Documentation
Cloudinary documentation can be found here:
[https://cloudinary.com/documentation](https://cloudinary.com/documentation)
