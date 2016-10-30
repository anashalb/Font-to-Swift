require 'xcodeproj'
project_path = '/Users/anas/Documents/RealtimeToDo/iOS App/Swift1/RealTimeTodo/RealTimeTodo.xcodeproj'; # /info.plist'
project = Xcodeproj::Project.open(project_path)
# project = Xcodeproj::Plist.read_from_path(project_path);
# puts project

# fileRef = project.new(Xcodeproj::Project::Object::PBXFileReference)
# fileRef.name = "xcode.rb"
# fileRef.fileEncoding = '4';
# fileRef.last_known_file_type = 'text.script.ruby'
# fileRef.path = 'xcode.rb'
# fileRef.source_tree = '<group>'

#"/Users/anas/Documents/RealtimeToDo/iOS App/Swift1/RealTimeTodo/RealTimeTodo/xcode.rb"

projectGroup = project.new(Xcodeproj::Project::Object::PBXGroup)
# projectGroup.name = "Fonts"
projectGroup.source_tree = "<group>"
projectGroup.path = "Fonts"

group = project.groups[0]
group << projectGroup

# project.groups.each do |group|
	
	# puts group.comments
# puts group.indent_width
# puts group.name
# puts group.path
# puts group.parent
# puts group.tab_width
# puts group.uses_tabs
# puts group.wraps_lines
# end
project.save

# target.product_name = name
# target.product_type = Constants::PRODUCT_TYPE_UTI[:bundle]