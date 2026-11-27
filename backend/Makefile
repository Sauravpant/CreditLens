.PHONY: data train serve clean install

install:
	pip install -r requirements.txt

data:
	python -m data.generate

train:
	python -m model.train

serve:
	uvicorn api.main:app --reload --port 8000

clean:
	rm -f data/loans.csv
	rm -rf model/artifacts/*