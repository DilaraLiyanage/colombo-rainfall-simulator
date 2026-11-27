// Generated from notebook outputs. Do not edit manually.
window.RAINFALL_EXPORT = {
  "model": {
    "schema_version": 2,
    "calibration_start": "2001-01-01",
    "calibration_end": "2020-12-31",
    "seed": 42,
    "wet_threshold_mm": 0.1,
    "extreme_threshold_mm": 25.2,
    "secondary_threshold_mm": 46.296,
    "state_order": [
      "dry",
      "wet"
    ],
    "homogeneous": {
      "transition_matrix": [
        [
          0.6555772994129159,
          0.34442270058708413
        ],
        [
          0.05603311047437122,
          0.9439668895256288
        ]
      ],
      "stationary_distribution": [
        0.13992332968236584,
        0.8600766703176342
      ],
      "amount_distribution": {
        "name": "lower_truncated_gamma",
        "shape": 0.7088471892310466,
        "scale_mm": 11.343818253534893,
        "lower_mm": 0.1,
        "parent_location_mm": 0
      }
    },
    "seasonal": {
      "NEM": {
        "transition_matrix": [
          [
            0.7275064267352185,
            0.27249357326478146
          ],
          [
            0.20565302144249512,
            0.7943469785575049
          ]
        ],
        "amount_distribution": {
          "name": "lower_truncated_gamma",
          "shape": 0.25818572176217985,
          "scale_mm": 16.126731012685692,
          "lower_mm": 0.1,
          "parent_location_mm": 0
        }
      },
      "FIM": {
        "transition_matrix": [
          [
            0.42857142857142855,
            0.5714285714285714
          ],
          [
            0.0603290676416819,
            0.9396709323583181
          ]
        ],
        "amount_distribution": {
          "name": "lower_truncated_gamma",
          "shape": 0.4706973290454147,
          "scale_mm": 10.715370471195637,
          "lower_mm": 0.1,
          "parent_location_mm": 0
        }
      },
      "SWM": {
        "transition_matrix": [
          [
            0.2564102564102564,
            0.7435897435897436
          ],
          [
            0.009930486593843098,
            0.9900695134061569
          ]
        ],
        "amount_distribution": {
          "name": "lower_truncated_gamma",
          "shape": 1.166920348757501,
          "scale_mm": 7.233503996656995,
          "lower_mm": 0.1,
          "parent_location_mm": 0
        }
      },
      "SIM": {
        "transition_matrix": [
          [
            0.5063291139240507,
            0.4936708860759494
          ],
          [
            0.03943908851884312,
            0.9605609114811569
          ]
        ],
        "amount_distribution": {
          "name": "lower_truncated_gamma",
          "shape": 0.7954736833149221,
          "scale_mm": 15.705930088566559,
          "lower_mm": 0.1,
          "parent_location_mm": 0
        }
      }
    },
    "season_by_month": {
      "1": "NEM",
      "2": "NEM",
      "3": "FIM",
      "4": "FIM",
      "5": "SWM",
      "6": "SWM",
      "7": "SWM",
      "8": "SWM",
      "9": "SWM",
      "10": "SIM",
      "11": "SIM",
      "12": "NEM"
    },
    "transition_season": "destination_date",
    "initial_state_semantics": "day_before_first_date",
    "holdout_initial_state": 1
  },
  "python_benchmarks": {
    "homogeneous": {
      "stationary_wet_probability": 0.8600766703176342,
      "mean_wet_mm": 8.359239054971088,
      "expected_daily_mm": 7.189586492788661,
      "mean_wet_spell_days": 17.84659090909091,
      "mean_dry_spell_days": 2.9034090909090913,
      "daily_P95_exceedance": 0.05448303761967418,
      "daily_P99_exceedance": 0.007369827858781427
    },
    "seasonal": {
      "stationary_wet_probability": 0.8608000830172113,
      "expected_daily_mm": 7.189990084813513,
      "daily_P95_exceedance": 0.05142846162107815,
      "daily_P99_exceedance": 0.008166322044797293
    }
  },
  "sensitivity_fixtures": [
    {
      "k01": 0.8,
      "k11": 1.0,
      "kb": 1.0,
      "p01": 0.2959226565783943,
      "p11": 0.9439668895256288,
      "beta_mm": 11.343818253534893,
      "targets": {
        "stationary_wet_probability": 0.8407950210801044,
        "expected_daily_mm": 7.028406577438048,
        "mean_wet_mm": 8.359239054971088,
        "mean_wet_spell_days": 17.846590909090914,
        "daily_P95_exceedance": 0.053261608348270116,
        "daily_P99_exceedance": 0.007204607198091352
      }
    },
    {
      "k01": 0.9,
      "k11": 1.0,
      "kb": 1.0,
      "p01": 0.32103769760843126,
      "p11": 0.9439668895256288,
      "beta_mm": 11.343818253534893,
      "targets": {
        "stationary_wet_probability": 0.8513989699725929,
        "expected_daily_mm": 7.117047521157055,
        "mean_wet_mm": 8.359239054971088,
        "mean_wet_spell_days": 17.846590909090914,
        "daily_P95_exceedance": 0.053933333749463935,
        "daily_P99_exceedance": 0.0072954703509450335
      }
    },
    {
      "k01": 1.0,
      "k11": 1.0,
      "kb": 1.0,
      "p01": 0.34442270058708413,
      "p11": 0.9439668895256288,
      "beta_mm": 11.343818253534893,
      "targets": {
        "stationary_wet_probability": 0.8600766703176342,
        "expected_daily_mm": 7.189586492788661,
        "mean_wet_mm": 8.359239054971088,
        "mean_wet_spell_days": 17.846590909090914,
        "daily_P95_exceedance": 0.05448303761967418,
        "daily_P99_exceedance": 0.007369827858781427
      }
    },
    {
      "k01": 1.1,
      "k11": 1.0,
      "kb": 1.0,
      "p01": 0.36625047294740826,
      "p11": 0.9439668895256288,
      "beta_mm": 11.343818253534893,
      "targets": {
        "stationary_wet_probability": 0.8673092853377513,
        "expected_daily_mm": 7.2500456507343936,
        "mean_wet_mm": 8.359239054971088,
        "mean_wet_spell_days": 17.846590909090914,
        "daily_P95_exceedance": 0.054941200071731075,
        "daily_P99_exceedance": 0.00743180271463633
      }
    },
    {
      "k01": 1.2,
      "k11": 1.0,
      "kb": 1.0,
      "p01": 0.38667154888319294,
      "p11": 0.9439668895256288,
      "beta_mm": 11.343818253534893,
      "targets": {
        "stationary_wet_probability": 0.8734300412476248,
        "expected_daily_mm": 7.301210512582153,
        "mean_wet_mm": 8.359239054971088,
        "mean_wet_spell_days": 17.846590909090914,
        "daily_P95_exceedance": 0.055328929893975094,
        "daily_P99_exceedance": 0.007484250268416305
      }
    },
    {
      "k01": 1.0,
      "k11": 0.8,
      "kb": 1.0,
      "p01": 0.34442270058708413,
      "p11": 0.9309262166405023,
      "beta_mm": 11.343818253534893,
      "targets": {
        "stationary_wet_probability": 0.8329519450800915,
        "expected_daily_mm": 6.9628444302276336,
        "mean_wet_mm": 8.359239054971088,
        "mean_wet_spell_days": 14.477272727272725,
        "daily_P95_exceedance": 0.05276477519430856,
        "daily_P99_exceedance": 0.007137401422143392
      }
    },
    {
      "k01": 1.0,
      "k11": 0.9,
      "kb": 1.0,
      "p01": 0.34442270058708413,
      "p11": 0.9381262084724908,
      "beta_mm": 11.343818253534893,
      "targets": {
        "stationary_wet_probability": 0.8477127104753391,
        "expected_daily_mm": 7.086233196800853,
        "mean_wet_mm": 8.359239054971088,
        "mean_wet_spell_days": 16.161931818181838,
        "daily_P95_exceedance": 0.05369982129435852,
        "daily_P99_exceedance": 0.007263883518194966
      }
    },
    {
      "k01": 1.0,
      "k11": 1.1,
      "kb": 1.0,
      "p01": 0.34442270058708413,
      "p11": 0.9488,
      "beta_mm": 11.343818253534893,
      "targets": {
        "stationary_wet_probability": 0.8705837659870836,
        "expected_daily_mm": 7.27741781726304,
        "mean_wet_mm": 8.359239054971088,
        "mean_wet_spell_days": 19.531249999999993,
        "daily_P95_exceedance": 0.05514862768668613,
        "daily_P99_exceedance": 0.00745986109541252
      }
    },
    {
      "k01": 1.0,
      "k11": 1.2,
      "kb": 1.0,
      "p01": 0.34442270058708413,
      "p11": 0.9528655597214784,
      "beta_mm": 11.343818253534893,
      "targets": {
        "stationary_wet_probability": 0.8796230859835101,
        "expected_daily_mm": 7.352979654007549,
        "mean_wet_mm": 8.359239054971088,
        "mean_wet_spell_days": 21.21590909090911,
        "daily_P95_exceedance": 0.05572123897637463,
        "daily_P99_exceedance": 0.007537317250931192
      }
    },
    {
      "k01": 1.0,
      "k11": 1.0,
      "kb": 0.8,
      "p01": 0.34442270058708413,
      "p11": 0.9439668895256288,
      "beta_mm": 9.075054602827915,
      "targets": {
        "stationary_wet_probability": 0.8600766703176342,
        "expected_daily_mm": 5.790370704546072,
        "mean_wet_mm": 6.7323889885394,
        "mean_wet_spell_days": 17.846590909090914,
        "daily_P95_exceedance": 0.029944765859748184,
        "daily_P99_exceedance": 0.002531666321225957
      }
    },
    {
      "k01": 1.0,
      "k11": 1.0,
      "kb": 0.9,
      "p01": 0.34442270058708413,
      "p11": 0.9439668895256288,
      "beta_mm": 10.209436428181403,
      "targets": {
        "stationary_wet_probability": 0.8600766703176342,
        "expected_daily_mm": 6.490283887933427,
        "mean_wet_mm": 7.546168977629058,
        "mean_wet_spell_days": 17.846590909090914,
        "daily_P95_exceedance": 0.04171247086088974,
        "daily_P99_exceedance": 0.00457782920137075
      }
    },
    {
      "k01": 1.0,
      "k11": 1.0,
      "kb": 1.1,
      "p01": 0.34442270058708413,
      "p11": 0.9439668895256288,
      "beta_mm": 12.478200078888383,
      "targets": {
        "stationary_wet_probability": 0.8600766703176342,
        "expected_daily_mm": 7.888377151057649,
        "mean_wet_mm": 9.171713898650918,
        "mean_wet_spell_days": 17.846590909090914,
        "daily_P95_exceedance": 0.06789405316765346,
        "daily_P99_exceedance": 0.01090061374697322
      }
    },
    {
      "k01": 1.0,
      "k11": 1.0,
      "kb": 1.2,
      "p01": 0.34442270058708413,
      "p11": 0.9439668895256288,
      "beta_mm": 13.612581904241871,
      "targets": {
        "stationary_wet_probability": 0.8600766703176342,
        "expected_daily_mm": 8.586731330069952,
        "mean_wet_mm": 9.983681253554748,
        "mean_wet_spell_days": 17.846590909090914,
        "daily_P95_exceedance": 0.08166038718488573,
        "daily_P99_exceedance": 0.015127264974979801
      }
    },
    {
      "k01": 1.0,
      "k11": 0.8,
      "kb": 0.8,
      "p01": 0.34442270058708413,
      "p11": 0.9309262166405023,
      "beta_mm": 9.075054602827915,
      "targets": {
        "stationary_wet_probability": 0.8329519450800915,
        "expected_daily_mm": 5.607756503039683,
        "mean_wet_mm": 6.7323889885394,
        "mean_wet_spell_days": 14.477272727272725,
        "daily_P95_exceedance": 0.029000380813298487,
        "daily_P99_exceedance": 0.002451823726110531
      }
    },
    {
      "k01": 1.0,
      "k11": 0.8,
      "kb": 0.9,
      "p01": 0.34442270058708413,
      "p11": 0.9309262166405023,
      "beta_mm": 10.209436428181403,
      "targets": {
        "stationary_wet_probability": 0.8329519450800915,
        "expected_daily_mm": 6.285596127819169,
        "mean_wet_mm": 7.546168977629058,
        "mean_wet_spell_days": 14.477272727272725,
        "daily_P95_exceedance": 0.04039696103469856,
        "daily_P99_exceedance": 0.004433455608228497
      }
    },
    {
      "k01": 1.0,
      "k11": 0.8,
      "kb": 1.1,
      "p01": 0.34442270058708413,
      "p11": 0.9309262166405023,
      "beta_mm": 12.478200078888383,
      "targets": {
        "stationary_wet_probability": 0.8329519450800915,
        "expected_daily_mm": 7.6395969315993915,
        "mean_wet_mm": 9.171713898650918,
        "mean_wet_spell_days": 14.477272727272725,
        "daily_P95_exceedance": 0.06575283994679537,
        "daily_P99_exceedance": 0.010556834915374364
      }
    },
    {
      "k01": 1.0,
      "k11": 0.8,
      "kb": 1.2,
      "p01": 0.34442270058708413,
      "p11": 0.9309262166405023,
      "beta_mm": 13.612581904241871,
      "targets": {
        "stationary_wet_probability": 0.8329519450800915,
        "expected_daily_mm": 8.315926719208074,
        "mean_wet_mm": 9.983681253554748,
        "mean_wet_spell_days": 14.477272727272725,
        "daily_P95_exceedance": 0.07908501728866084,
        "daily_P99_exceedance": 0.014650187848948358
      }
    },
    {
      "k01": 1.0,
      "k11": 0.9,
      "kb": 0.8,
      "p01": 0.34442270058708413,
      "p11": 0.9381262084724908,
      "beta_mm": 9.075054602827915,
      "targets": {
        "stationary_wet_probability": 0.8477127104753391,
        "expected_daily_mm": 5.7071317174490614,
        "mean_wet_mm": 6.7323889885394,
        "mean_wet_spell_days": 16.161931818181838,
        "daily_P95_exceedance": 0.029514297396465574,
        "daily_P99_exceedance": 0.0024952725649365686
      }
    },
    {
      "k01": 1.0,
      "k11": 0.9,
      "kb": 0.9,
      "p01": 0.34442270058708413,
      "p11": 0.9381262084724908,
      "beta_mm": 10.209436428181403,
      "targets": {
        "stationary_wet_probability": 0.8477127104753391,
        "expected_daily_mm": 6.396983357730848,
        "mean_wet_mm": 7.546168977629058,
        "mean_wet_spell_days": 16.161931818181838,
        "daily_P95_exceedance": 0.04111283674401911,
        "daily_P99_exceedance": 0.00451202100267873
      }
    },
    {
      "k01": 1.0,
      "k11": 0.9,
      "kb": 1.1,
      "p01": 0.34442270058708413,
      "p11": 0.9381262084724908,
      "beta_mm": 12.478200078888383,
      "targets": {
        "stationary_wet_probability": 0.8477127104753391,
        "expected_daily_mm": 7.774978448729709,
        "mean_wet_mm": 9.171713898650918,
        "mean_wet_spell_days": 16.161931818181838,
        "daily_P95_exceedance": 0.066918047916185,
        "daily_P99_exceedance": 0.01074391289078772
      }
    },
    {
      "k01": 1.0,
      "k11": 0.9,
      "kb": 1.2,
      "p01": 0.34442270058708413,
      "p11": 0.9381262084724908,
      "beta_mm": 13.612581904241871,
      "targets": {
        "stationary_wet_probability": 0.8477127104753391,
        "expected_daily_mm": 8.463293495972726,
        "mean_wet_mm": 9.983681253554748,
        "mean_wet_spell_days": 16.161931818181838,
        "daily_P95_exceedance": 0.08048648515649177,
        "daily_P99_exceedance": 0.014909804249524553
      }
    },
    {
      "k01": 1.0,
      "k11": 1.1,
      "kb": 0.8,
      "p01": 0.34442270058708413,
      "p11": 0.9488,
      "beta_mm": 9.075054602827915,
      "targets": {
        "stationary_wet_probability": 0.8705837659870836,
        "expected_daily_mm": 5.861108559732604,
        "mean_wet_mm": 6.7323889885394,
        "mean_wet_spell_days": 19.531249999999993,
        "daily_P95_exceedance": 0.03031058501348879,
        "daily_P99_exceedance": 0.0025625943316676543
      }
    },
    {
      "k01": 1.0,
      "k11": 1.1,
      "kb": 0.9,
      "p01": 0.34442270058708413,
      "p11": 0.9488,
      "beta_mm": 10.209436428181403,
      "targets": {
        "stationary_wet_probability": 0.8705837659870836,
        "expected_daily_mm": 6.569572207319206,
        "mean_wet_mm": 7.546168977629058,
        "mean_wet_spell_days": 19.531249999999993,
        "daily_P95_exceedance": 0.04222204975899266,
        "daily_P99_exceedance": 0.004633754086950355
      }
    },
    {
      "k01": 1.0,
      "k11": 1.1,
      "kb": 1.1,
      "p01": 0.34442270058708413,
      "p11": 0.9488,
      "beta_mm": 12.478200078888383,
      "targets": {
        "stationary_wet_probability": 0.8705837659870836,
        "expected_daily_mm": 7.984745226443593,
        "mean_wet_mm": 9.171713898650918,
        "mean_wet_spell_days": 19.531249999999993,
        "daily_P95_exceedance": 0.06872347842314348,
        "daily_P99_exceedance": 0.011033780702255082
      }
    },
    {
      "k01": 1.0,
      "k11": 1.1,
      "kb": 1.2,
      "p01": 0.34442270058708413,
      "p11": 0.9488,
      "beta_mm": 13.612581904241871,
      "targets": {
        "stationary_wet_probability": 0.8705837659870836,
        "expected_daily_mm": 8.691630824134341,
        "mean_wet_mm": 9.983681253554748,
        "mean_wet_spell_days": 19.531249999999993,
        "daily_P95_exceedance": 0.08265798836413758,
        "daily_P99_exceedance": 0.015312066662776454
      }
    },
    {
      "k01": 1.0,
      "k11": 1.2,
      "kb": 0.8,
      "p01": 0.34442270058708413,
      "p11": 0.9528655597214784,
      "beta_mm": 9.075054602827915,
      "targets": {
        "stationary_wet_probability": 0.8796230859835101,
        "expected_daily_mm": 5.921964778140429,
        "mean_wet_mm": 6.7323889885394,
        "mean_wet_spell_days": 21.21590909090911,
        "daily_P95_exceedance": 0.03062530151512854,
        "daily_P99_exceedance": 0.002589201892123033
      }
    },
    {
      "k01": 1.0,
      "k11": 1.2,
      "kb": 0.9,
      "p01": 0.34442270058708413,
      "p11": 0.9528655597214784,
      "beta_mm": 10.209436428181403,
      "targets": {
        "stationary_wet_probability": 0.8796230859835101,
        "expected_daily_mm": 6.637784443455102,
        "mean_wet_mm": 7.546168977629058,
        "mean_wet_spell_days": 21.21590909090911,
        "daily_P95_exceedance": 0.042660443666147414,
        "daily_P99_exceedance": 0.0046818666151333295
      }
    },
    {
      "k01": 1.0,
      "k11": 1.2,
      "kb": 1.1,
      "p01": 0.34442270058708413,
      "p11": 0.9528655597214784,
      "beta_mm": 12.478200078888383,
      "targets": {
        "stationary_wet_probability": 0.8796230859835101,
        "expected_daily_mm": 8.067651283289171,
        "mean_wet_mm": 9.171713898650918,
        "mean_wet_spell_days": 21.21590909090911,
        "daily_P95_exceedance": 0.06943703814824354,
        "daily_P99_exceedance": 0.011148345065197223
      }
    },
    {
      "k01": 1.0,
      "k11": 1.2,
      "kb": 1.2,
      "p01": 0.34442270058708413,
      "p11": 0.9528655597214784,
      "beta_mm": 13.612581904241871,
      "targets": {
        "stationary_wet_probability": 0.8796230859835101,
        "expected_daily_mm": 8.781876513727546,
        "mean_wet_mm": 9.983681253554748,
        "mean_wet_spell_days": 21.21590909090911,
        "daily_P95_exceedance": 0.0835162308863114,
        "daily_P99_exceedance": 0.015471052708438031
      }
    }
  ],
  "source_sha256": "5f1449de7ae2774d8309237adf2f243a33d6c63a18cce849c53e9906a12f509a",
  "source_git_blob": "11285a3f26a0e4ebe135cabc28a0c11962699ed1"
};
