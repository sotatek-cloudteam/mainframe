# Zip planet source code
zip_planet_source:
	cd PlanetsDemo-v1 && zip -r ../PlanetsDemo-v1.zip .
# Deploy planet to AWS
plan_planet:
	make zip_planet_source
	terraform init
	terraform plan

deploy_planet:
	make plan_planet
	terraform apply

# Destroy planet from AWS
destroy_planet:
	terraform destroy

clean:
	rm -f PlanetsDemo-v1.zip
	terraform destroy